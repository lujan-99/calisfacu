import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DimensionDto {
  @ApiProperty({ example: 'SABER', description: 'Mayúsculas y guion bajo; único en la gestión' })
  @IsString()
  @Matches(/^[A-Z][A-Z_]{1,29}$/, {
    message:
      'El código debe tener de 2 a 30 letras mayúsculas o guiones bajos (por ejemplo, SABER)',
  })
  codigo: string;

  @ApiProperty({ example: 'Saber' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;

  @ApiProperty({ example: 45, minimum: 1, maximum: 100 })
  @IsInt({ message: 'El puntaje máximo debe ser un número entero' })
  @Min(1, { message: 'El puntaje máximo debe ser mayor que 0' })
  @Max(100)
  puntajeMaximo: number;

  @ApiProperty({
    required: false,
    description: 'Orden en planillas y boletines; por defecto, el de la lista',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

/** US-18, criterio 6: el conjunto completo de dimensiones de una gestión; deben sumar 100. */
export class ConfigurarDimensionesDto {
  @ApiProperty({ type: [DimensionDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'La gestión debe tener al menos una dimensión' })
  @ArrayMaxSize(10)
  @Type(() => DimensionDto)
  dimensiones: DimensionDto[];
}
