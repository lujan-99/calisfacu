import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

/** US-10, criterio 2: el trimestre cuyas notas entrega el profesor. */
export class EntregarNotasDto {
  @ApiProperty()
  @IsInt({ message: 'Indique el trimestre' })
  @IsPositive()
  trimestreId: number;
}
