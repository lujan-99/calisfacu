import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Recortar } from '../../common/transformaciones';
import { EstadoSolicitud } from '../../database/entities';

/** Decisión D16: el profesor pide editar notas ya registradas de una actividad. */
export class CrearSolicitudDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  actividadId: number;

  @ApiProperty({ type: [Number] })
  @ArrayNotEmpty({ message: 'Seleccione al menos un estudiante' })
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  estudianteIds: number[];

  @ApiProperty({ example: 'Error de transcripción verificado con la hoja de respuestas' })
  @Recortar()
  @IsString()
  @IsNotEmpty({ message: 'El motivo de la solicitud es obligatorio' })
  @MaxLength(500)
  motivo: string;
}

export class FiltroSolicitudesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  actividadId?: number;

  @ApiPropertyOptional({ enum: EstadoSolicitud })
  @IsOptional()
  @IsEnum(EstadoSolicitud)
  estado?: EstadoSolicitud;
}

export class RechazarSolicitudDto {
  @ApiProperty({ example: 'Falta la hoja de respuestas del examen' })
  @Recortar()
  @IsString()
  @IsNotEmpty({ message: 'Explique al profesor por qué se rechaza' })
  @MaxLength(500)
  observacion: string;
}
