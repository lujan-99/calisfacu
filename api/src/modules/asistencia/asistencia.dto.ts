import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsEnum, IsInt, IsPositive, ValidateNested } from 'class-validator';
import { EstadoAsistencia } from '../../database/entities';

export class RegistroAsistenciaDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  estudianteId: number;

  @ApiProperty({ enum: EstadoAsistencia })
  @IsEnum(EstadoAsistencia, { message: 'El estado debe ser PRESENTE, AUSENTE o LICENCIA' })
  estado: EstadoAsistencia;
}

/** US-19, criterio 1: la asistencia de una clase, con todos los estudiantes del curso. */
export class RegistrarAsistenciaDto {
  @ApiProperty({ type: [RegistroAsistenciaDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => RegistroAsistenciaDto)
  registros: RegistroAsistenciaDto[];
}
