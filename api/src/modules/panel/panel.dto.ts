import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class FiltroRiesgoDto {
  @ApiPropertyOptional({ description: 'Por defecto, el primer trimestre abierto de la gestión' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  trimestreId?: number;
}

/** Umbral de asistencia de la gestión (decisión D6). */
export class UmbralAsistenciaDto {
  @ApiProperty({ example: 80, description: 'Porcentaje de 0 a 100, con un decimal como máximo' })
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'El umbral debe tener un decimal como máximo' })
  @Min(0, { message: 'El umbral no puede ser menor que 0' })
  @Max(100, { message: 'El umbral no puede ser mayor que 100' })
  umbralAsistencia: number;
}
