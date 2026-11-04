import { Module } from '@nestjs/common';
import { CalculoModule } from '../calculo/calculo.module';
import { CentralizacionController } from './centralizacion.controller';
import { CentralizacionService } from './centralizacion.service';

/** Centralización de notas por curso y trimestre y su planilla oficial en PDF y Excel (US-09). */
@Module({
  imports: [CalculoModule],
  controllers: [CentralizacionController],
  providers: [CentralizacionService],
})
export class CentralizacionModule {}
