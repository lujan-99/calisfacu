import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, Max, MinLength, ValidateNested } from 'class-validator';
import { pipeValidacion, traducirRestriccion } from './validacion';

class Hijo {
  @IsInt()
  @Max(100)
  valor: number;
}

class Ejemplo {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  nombre: string;

  @IsInt({ message: 'La nota debe ser un número entero' })
  nota: number;

  @ValidateNested({ each: true })
  @Type(() => Hijo)
  hijos: Hijo[];
}

const meta: ArgumentMetadata = { type: 'body', metatype: Ejemplo };

async function mensajes(cuerpo: unknown): Promise<string[]> {
  try {
    await pipeValidacion().transform(cuerpo, meta);
  } catch (e) {
    const r = (e as BadRequestException).getResponse() as { message: string[] };
    return r.message;
  }
  throw new Error('La validación debía fallar');
}

/** CAL-004: los mensajes de validación salen en español y los DTO conservan los suyos. */
describe('Mensajes de validación (CAL-004)', () => {
  it('debe traducir los mensajes por defecto de class-validator', async () => {
    const m = await mensajes({ email: 123, nombre: 'a', nota: 1, hijos: [] });
    expect(m).toEqual([
      'El campo «email» debe ser un correo electrónico válido',
      'El campo «nombre» debe tener al menos 3 caracteres',
    ]);
  });

  it('debe conservar el mensaje propio del DTO', async () => {
    const m = await mensajes({ email: 'a@b.test', nombre: 'Ana', nota: 'x', hijos: [] });
    expect(m).toEqual(['La nota debe ser un número entero']);
  });

  it('debe indicar la ruta de los campos anidados', async () => {
    const m = await mensajes({
      email: 'a@b.test',
      nombre: 'Ana',
      nota: 1,
      hijos: [{ valor: 200 }],
    });
    expect(m).toEqual(['El campo «hijos.0.valor» debe ser menor o igual que 100']);
  });

  it('debe rechazar en español un campo que no existe', async () => {
    const m = await mensajes({ email: 'a@b.test', nombre: 'Ana', nota: 1, hijos: [], rol: 'x' });
    expect(m).toEqual(['El campo «rol» no es un campo permitido']);
  });

  it('debe dar un mensaje genérico en español a una restricción desconocida', () => {
    expect(traducirRestriccion('isUuid', 'id', 'id', 'id must be a UUID')).toBe(
      'El campo «id» no es válido',
    );
  });
});
