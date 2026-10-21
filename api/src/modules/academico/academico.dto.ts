import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Mayusculas, Recortar } from '../../common/transformaciones';
import { Nivel } from '../../database/entities';

// ---------- Cursos (US-18, criterio 1) ----------

export class DatosCursoDto {
  @ApiProperty({ enum: Nivel })
  @IsEnum(Nivel, { message: 'El nivel debe ser INICIAL, PRIMARIA o SECUNDARIA' })
  nivel: Nivel;

  @ApiProperty({ minimum: 1, maximum: 6, example: 4 })
  @IsInt()
  @Min(1)
  @Max(6)
  anioEscolaridad: number;

  @ApiProperty({ example: 'A', description: 'Una o dos letras' })
  @Mayusculas()
  @Matches(/^[A-Z]{1,2}$/, { message: 'El paralelo debe ser una o dos letras (A, B…)' })
  paralelo: string;
}

export class CrearCursoDto extends DatosCursoDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  gestionId: number;
}

export class FiltroCursosDto {
  @ApiPropertyOptional({ description: 'Por defecto, la gestión más reciente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  gestionId?: number;

  @ApiPropertyOptional({ enum: Nivel })
  @IsOptional()
  @IsEnum(Nivel)
  nivel?: Nivel;
}

// ---------- Estudiantes (US-18, criterio 3) ----------

export class DatosEstudianteDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  cursoId: number;

  @ApiProperty({
    example: '80800012345678',
    description: 'Código RUDE del Ministerio (decisión D10)',
  })
  @Mayusculas()
  @Matches(/^[0-9A-Z]{6,20}$/, {
    message: 'El código RUDE debe tener de 6 a 20 letras o números',
  })
  codigoRude: string;

  @ApiPropertyOptional({
    example: '7654321 LP',
    description: 'Cédula de identidad, opcional (decisión D15); vacío la borra',
  })
  @Mayusculas()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsOptional()
  @Matches(/^[0-9A-Z][0-9A-Z -]{3,13}[0-9A-Z]$/, {
    message: 'El CI debe tener de 5 a 15 caracteres: números, letras, espacio o guion',
  })
  ci?: string | null;

  @ApiProperty({ example: 'Ana' })
  @Recortar()
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @MaxLength(80)
  nombres: string;

  @ApiProperty({ example: 'Quispe Mamani' })
  @Recortar()
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @MaxLength(80)
  apellidos: string;
}

export class FiltroEstudiantesDto {
  @ApiPropertyOptional({ description: 'Por defecto, la gestión más reciente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  gestionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cursoId?: number;

  @ApiPropertyOptional({ description: 'Parte del apellido, sin distinguir mayúsculas' })
  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(80)
  apellido?: string;
}

// ---------- Materias y asignaciones ----------

export class DatosMateriaDto {
  @ApiProperty({ example: 'Matemática' })
  @Recortar()
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la materia es obligatorio' })
  @MaxLength(80)
  nombre: string;

  @ApiProperty({ description: 'Profesor asignado: una materia tiene un solo profesor' })
  @IsInt()
  @IsPositive()
  profesorId: number;
}

export class CrearMateriaDto extends DatosMateriaDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  cursoId: number;
}

export class FiltroMateriasDto {
  @ApiPropertyOptional({ description: 'Por defecto, la gestión más reciente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  gestionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cursoId?: number;
}

// ---------- Unidad educativa (US-18, criterio 5) y apariencia (ADR-0010) ----------

export class DatosUnidadEducativaDto {
  @ApiProperty({ example: 'Unidad Educativa Juana Azurduy' })
  @Recortar()
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: '80980123', description: 'Código SIE del Ministerio: 8 dígitos' })
  @Recortar()
  @Matches(/^\d{8}$/, { message: 'El código SIE debe tener 8 dígitos' })
  codigoSie: string;
}

export class ColoresDto {
  @ApiProperty({ example: '#13283F', description: 'Encabezado; lleva texto blanco' })
  @IsString()
  marca: string;

  @ApiProperty({ example: '#1D4E89', description: 'Botones y enlaces; lleva texto blanco' })
  @IsString()
  primario: string;

  @ApiProperty({ example: '#F2B33D', description: 'Detalles sobre el color de marca' })
  @IsString()
  acento: string;
}
