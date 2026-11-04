import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';

/**
 * Mensajes de validación en español (CAL-004, revisión OWASP del Sprint 3, hallazgo H4). Los DTO que ya dan su propio
 * mensaje lo conservan; los mensajes por defecto de class-validator, que están en inglés, se traducen aquí con el
 * nombre de la restricción. Una restricción desconocida recibe un mensaje genérico, nunca el texto en inglés.
 */
type Traductor = (campo: string, numero: string | undefined) => string;

const TRADUCCIONES: Record<string, Traductor> = {
  isEmail: (c) => `${c} debe ser un correo electrónico válido`,
  isString: (c) => `${c} debe ser un texto`,
  isInt: (c) => `${c} debe ser un número entero`,
  isNumber: (c) => `${c} debe ser un número`,
  isPositive: (c) => `${c} debe ser un número mayor que 0`,
  isBoolean: (c) => `${c} debe ser verdadero o falso`,
  isNotEmpty: (c) => `${c} es obligatorio`,
  isDefined: (c) => `${c} es obligatorio`,
  isEnum: (c) => `${c} no tiene un valor permitido`,
  isIn: (c) => `${c} no tiene un valor permitido`,
  isArray: (c) => `${c} debe ser una lista`,
  isDateString: (c) => `${c} debe ser una fecha válida`,
  isIso8601: (c) => `${c} debe ser una fecha válida`,
  min: (c, n) => `${c} debe ser mayor o igual que ${n}`,
  max: (c, n) => `${c} debe ser menor o igual que ${n}`,
  minLength: (c, n) => `${c} debe tener al menos ${n} caracteres`,
  maxLength: (c, n) => `${c} debe tener como máximo ${n} caracteres`,
  matches: (c) => `${c} no tiene el formato esperado`,
  arrayMinSize: (c, n) => `${c} debe tener al menos ${n} elementos`,
  arrayMaxSize: (c, n) => `${c} debe tener como máximo ${n} elementos`,
  arrayNotEmpty: (c) => `${c} no puede estar vacío`,
  arrayUnique: (c) => `${c} no puede tener elementos repetidos`,
  nestedValidation: (c) => `${c} debe ser un objeto o una lista`,
  whitelistValidation: (c) => `${c} no es un campo permitido`,
};

/** ¿Es el mensaje por defecto de class-validator? Todos empiezan con el nombre de la propiedad. */
function esMensajePorDefecto(propiedad: string, mensaje: string) {
  return [
    `${propiedad} `,
    `each value in ${propiedad} `,
    `property ${propiedad} `,
    `nested property ${propiedad} `,
  ].some((inicio) => mensaje.startsWith(inicio));
}

export function traducirRestriccion(
  restriccion: string,
  ruta: string,
  propiedad: string,
  mensaje: string,
) {
  if (!esMensajePorDefecto(propiedad, mensaje)) return mensaje;
  const campo = `El campo «${ruta}»`;
  const numero = /(\d+(?:\.\d+)?)/.exec(mensaje)?.[1];
  return (TRADUCCIONES[restriccion] ?? ((c: string) => `${c} no es válido`))(campo, numero);
}

/** Aplana los errores (los anidados llevan la ruta, por ejemplo «notas.0.valor») y los traduce. */
export function mensajesValidacion(errores: readonly ValidationError[], prefijo = ''): string[] {
  return errores.flatMap((e) => {
    const ruta = prefijo ? `${prefijo}.${e.property}` : e.property;
    const propios = Object.entries(e.constraints ?? {}).map(([restriccion, mensaje]) =>
      traducirRestriccion(restriccion, ruta, e.property, mensaje),
    );
    return [...propios, ...mensajesValidacion(e.children ?? [], ruta)];
  });
}

/** El ValidationPipe global de la API, con la misma forma de respuesta de NestJS y los mensajes en español. */
export function pipeValidacion() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errores) => new BadRequestException(mensajesValidacion(errores)),
  });
}
