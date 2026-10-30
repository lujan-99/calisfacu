import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AsignacionMateria,
  DimensionEvaluacion,
  Estudiante,
  Materia,
  Nota,
  Trimestre,
} from '../../database/entities';
import { NotasModule } from '../notas/notas.module';
import { CalculoController } from './calculo.controller';
import { CalculoService } from './calculo.service';
import { DimensionesController } from './dimensiones.controller';
import { DimensionesService } from './dimensiones.service';
import { HistorialController } from './historial.controller';
import { HistorialService } from './historial.service';
import { NotasTrimestralesService } from './notas-trimestrales.service';

@Module({
  imports: [
    NotasModule,
    TypeOrmModule.forFeature([
      Materia,
      Trimestre,
      DimensionEvaluacion,
      Estudiante,
      Nota,
      AsignacionMateria,
    ]),
  ],
  controllers: [CalculoController, DimensionesController, HistorialController],
  providers: [CalculoService, DimensionesService, HistorialService, NotasTrimestralesService],
  exports: [CalculoService, NotasTrimestralesService],
})
export class CalculoModule {}
