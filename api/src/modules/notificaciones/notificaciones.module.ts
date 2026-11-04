import { Module } from '@nestjs/common';
import { CalculoModule } from '../calculo/calculo.module';
import { NotasModule } from '../notas/notas.module';
import { AlertasService } from './alertas.service';
import { AlertasController } from './notificaciones.controller';

/** Notificaciones (US-08): alertas de promedio bajo al recalcular. El correo (T-061) se agrega aquí. */
@Module({
  imports: [NotasModule, CalculoModule],
  controllers: [AlertasController],
  providers: [AlertasService],
})
export class NotificacionesModule {}
