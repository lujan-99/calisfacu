import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

/** US-09: el trimestre que se centraliza y si además se cierra (decisión D21). */
export class EjecutarCentralizacionDto {
  @ApiProperty()
  @IsInt({ message: 'Indique el trimestre' })
  @IsPositive()
  trimestreId: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  cerrarTrimestre?: boolean;
}
