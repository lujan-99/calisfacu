import { Module } from '@nestjs/common';
import { NotasModule } from '../notas/notas.module';
import { AsistenciaController } from './asistencia.controller';
import { AsistenciaService } from './asistencia.service';

@Module({
  imports: [NotasModule],
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
  exports: [AsistenciaService],
})
export class AsistenciaModule {}
