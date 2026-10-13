import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nota, RegistroAuditoria } from '../../database/entities';
import { NotasModule } from '../notas/notas.module';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';

@Module({
  imports: [NotasModule, TypeOrmModule.forFeature([Nota, RegistroAuditoria])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
})
export class AuditoriaModule {}
