import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actividad, AsignacionMateria, Estudiante, Nota } from '../../database/entities';
import { AccesoNotasService } from './acceso.service';
import { CambiosNotasService } from './cambios-notas.service';
import { NotasController } from './notas.controller';
import { NotasService } from './notas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Actividad, AsignacionMateria, Estudiante, Nota])],
  controllers: [NotasController],
  providers: [NotasService, AccesoNotasService, CambiosNotasService],
  exports: [AccesoNotasService, NotasService, CambiosNotasService],
})
export class NotasModule {}
