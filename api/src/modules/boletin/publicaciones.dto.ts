import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class PublicarBoletinDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  cursoId: number;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  trimestreId: number;
}

export class FiltroPublicacionesDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cursoId: number;
}
