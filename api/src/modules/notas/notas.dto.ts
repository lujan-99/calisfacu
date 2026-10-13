import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ESCALA_MAX, ESCALA_MIN } from '../calculo/reglas';

export class NotaPlanillaDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  estudianteId: number;

  @ApiProperty({ minimum: ESCALA_MIN, maximum: ESCALA_MAX, example: 75 })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La nota debe ser un número con hasta dos decimales' },
  )
  @Min(ESCALA_MIN, { message: `La nota debe estar entre ${ESCALA_MIN} y ${ESCALA_MAX}` })
  @Max(ESCALA_MAX, { message: `La nota debe estar entre ${ESCALA_MIN} y ${ESCALA_MAX}` })
  valor: number;
}

export class RegistrarPlanillaDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  actividadId: number;

  @ApiProperty({ type: [NotaPlanillaDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => NotaPlanillaDto)
  notas: NotaPlanillaDto[];
}

export class CrearActividadDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  materiaId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  trimestreId: number;

  @ApiProperty({
    description: 'Dimensión de evaluación de la gestión (Ser, Saber, Hacer o Autoevaluación)',
  })
  @IsInt()
  @IsPositive()
  dimensionId: number;

  @ApiProperty({ example: 'Examen 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;
}
