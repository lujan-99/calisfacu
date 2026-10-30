import { Module } from '@nestjs/common';
import { CalculoModule } from '../calculo/calculo.module';
import { NotasModule } from '../notas/notas.module';
import { BoletinController } from './boletin.controller';
import { BoletinService } from './boletin.service';
import { ColaBoletinesService } from './cola-boletines.service';

/** Boletín de notas en PDF (US-07) y su cola para cursos grandes (ADR-0006). */
@Module({
  imports: [NotasModule, CalculoModule],
  controllers: [BoletinController],
  providers: [BoletinService, ColaBoletinesService],
  exports: [BoletinService],
})
export class BoletinModule {}
