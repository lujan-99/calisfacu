import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Parentesco } from '../../database/entities';

/** Vínculo que registra la secretaria (US-20, criterio 1). */
export class CrearVinculoDto {
  @ApiProperty({ description: 'Usuario con rol PADRE' })
  @IsInt()
  @IsPositive()
  padreId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  estudianteId: number;

  @ApiPropertyOptional({ enum: Parentesco, default: Parentesco.PADRE })
  @IsOptional()
  @IsEnum(Parentesco, { message: 'El parentesco no es válido' })
  parentesco?: Parentesco;
}

export class FiltroVinculosDto {
  @ApiPropertyOptional({ description: 'Sin curso ni estudiante, la gestión más reciente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cursoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  padreId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  estudianteId?: number;
}
