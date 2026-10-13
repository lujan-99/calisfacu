import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { ESCALA_MAX, ESCALA_MIN } from '../calculo/reglas';

export class CorregirNotaDto {
  @ApiProperty({ minimum: ESCALA_MIN, maximum: ESCALA_MAX })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(ESCALA_MIN, { message: `La nota debe estar entre ${ESCALA_MIN} y ${ESCALA_MAX}` })
  @Max(ESCALA_MAX, { message: `La nota debe estar entre ${ESCALA_MIN} y ${ESCALA_MAX}` })
  valor: number;

  @ApiProperty({ example: 'Error de transcripción del examen' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de la corrección es obligatorio' })
  @MaxLength(500)
  motivo: string;
}
