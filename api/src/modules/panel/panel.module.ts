import { Module } from '@nestjs/common';
import { AsistenciaModule } from '../asistencia/asistencia.module';
import { CalculoModule } from '../calculo/calculo.module';
import { NotasModule } from '../notas/notas.module';
import { PanelRiesgoController, UmbralAsistenciaController } from './panel.controller';
import { PanelService } from './panel.service';

/** Panel de riesgo académico (US-06) y umbral de asistencia por gestión (decisión D6). */
@Module({
  imports: [NotasModule, CalculoModule, AsistenciaModule],
  controllers: [PanelRiesgoController, UmbralAsistenciaController],
  providers: [PanelService],
})
export class PanelModule {}
