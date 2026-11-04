import { Module } from '@nestjs/common';
import { CalculoModule } from '../calculo/calculo.module';
import { NotasModule } from '../notas/notas.module';
import { AlertasService } from './alertas.service';
import { AvisosBoletinService } from './avisos-boletin.service';
import { CorreosService } from './correo/correos.service';
import { AlertasController, AvisosPadreController } from './notificaciones.controller';

/**
 * Notificaciones (decisión D7: aviso dentro del sistema y correo): alertas de promedio bajo (US-08) y avisos de boletín
 * al padre (US-12), con la bandeja de salida de correos (ADR-0011).
 */
@Module({
  imports: [NotasModule, CalculoModule],
  controllers: [AlertasController, AvisosPadreController],
  providers: [AlertasService, AvisosBoletinService, CorreosService],
  exports: [AvisosBoletinService],
})
export class NotificacionesModule {}
