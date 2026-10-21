import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nota, RegistroAuditoria } from '../../database/entities';
import { NotasModule } from '../notas/notas.module';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  imports: [NotasModule, TypeOrmModule.forFeature([Nota, RegistroAuditoria])],
  controllers: [AuditoriaController, SolicitudesController],
  providers: [AuditoriaService, SolicitudesService],
})
export class AuditoriaModule {}
