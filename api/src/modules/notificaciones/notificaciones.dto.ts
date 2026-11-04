import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** US-08: lo que hizo el profesor con la alerta (por ejemplo, que habló con el tutor). */
export class AtenderAlertaDto {
  @ApiProperty({ example: 'Se habló con la madre por teléfono; asistirá a reforzamiento.' })
  @IsString()
  @IsNotEmpty({ message: 'Escriba qué hizo con la alerta' })
  @MaxLength(500)
  notaAtencion: string;
}
