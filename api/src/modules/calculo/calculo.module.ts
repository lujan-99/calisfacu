import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionEvaluacion, Estudiante, Materia, Nota, Trimestre } from '../../database/entities';
import { NotasModule } from '../notas/notas.module';
import { CalculoController } from './calculo.controller';
import { CalculoService } from './calculo.service';

@Module({
  imports: [
    NotasModule,
    TypeOrmModule.forFeature([Materia, Trimestre, DimensionEvaluacion, Estudiante, Nota]),
  ],
  controllers: [CalculoController],
  providers: [CalculoService],
  exports: [CalculoService],
})
export class CalculoModule {}
