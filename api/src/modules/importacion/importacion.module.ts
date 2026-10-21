import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estudiante, Nota } from '../../database/entities';
import { NotasModule } from '../notas/notas.module';
import { ImportacionController } from './importacion.controller';
import { ImportacionService } from './importacion.service';

@Module({
  imports: [NotasModule, TypeOrmModule.forFeature([Estudiante, Nota])],
  controllers: [ImportacionController],
  providers: [ImportacionService],
})
export class ImportacionModule {}
