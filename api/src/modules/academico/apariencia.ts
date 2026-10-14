import { BadRequestException } from '@nestjs/common';

/**
 * Apariencia de la institución (ADR-0010): la web toma de GET /api/institucion los colores y el logo, así que se
 * cambian desde la pantalla del administrador sin tocar el código. Los valores predeterminados son los del diseño.
 */
export interface Colores {
  /** Encabezado y franja de la institución; lleva texto blanco. */
  marca: string;
  /** Botones y enlaces; lleva texto blanco. */
  primario: string;
  /** Detalles sobre el color de marca (logo por defecto, rol del usuario, foco). */
  acento: string;
}

export const COLORES_PREDETERMINADOS: Colores = {
  marca: '#13283F',
  primario: '#1D4E89',
  acento: '#F2B33D',
};

/** WCAG 2.1, nivel AA para texto normal. */
export const CONTRASTE_MINIMO = 4.5;
/** El acento es un detalle gráfico sobre la marca: WCAG 2.1 pide 3:1 para componentes no textuales. */
export const CONTRASTE_MINIMO_ACENTO = 3;

export const LOGO_MAX_BYTES = 256 * 1024;
export const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type TipoLogo = (typeof TIPOS_LOGO)[number];

const HEX = /^#[0-9A-F]{6}$/;

export function normalizarColor(valor: string): string {
  const color = valor.trim().toUpperCase();
  if (!HEX.test(color)) throw new BadRequestException(`Color inválido: ${valor} (use #RRGGBB)`);
  return color;
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste de WCAG 2.1, de 1 (iguales) a 21 (negro sobre blanco). */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Normaliza los tres colores y exige que el texto siga siendo legible (accesibilidad, también en el celular). */
export function validarColores(colores: Colores): Colores {
  const c: Colores = {
    marca: normalizarColor(colores.marca),
    primario: normalizarColor(colores.primario),
    acento: normalizarColor(colores.acento),
  };
  for (const [clave, nombre] of [
    ['marca', 'de marca'],
    ['primario', 'primario'],
  ] as const) {
    if (contraste(c[clave], '#FFFFFF') < CONTRASTE_MINIMO) {
      throw new BadRequestException(
        `El color ${nombre} no tiene contraste suficiente con el texto blanco (mínimo ${CONTRASTE_MINIMO}:1)`,
      );
    }
  }
  if (contraste(c.acento, c.marca) < CONTRASTE_MINIMO_ACENTO) {
    throw new BadRequestException(
      `El color de acento no se distingue sobre el color de marca (mínimo ${CONTRASTE_MINIMO_ACENTO}:1)`,
    );
  }
  return c;
}

/**
 * Tipo real de la imagen según sus primeros bytes. No se confía en el nombre ni en el Content-Type del cliente, y
 * no se admite SVG: puede llevar código que el navegador ejecuta.
 */
export function detectarTipoImagen(datos: Buffer): TipoLogo | null {
  if (datos.length >= 8 && datos.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return 'image/png';
  }
  if (datos.length >= 3 && datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    datos.length >= 12 &&
    datos.toString('latin1', 0, 4) === 'RIFF' &&
    datos.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
