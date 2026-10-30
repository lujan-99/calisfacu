import { Module } from '@nestjs/common';
import { CalculoModule } from '../calculo/calculo.module';
import { FamiliasModule } from '../familias/familias.module';
import { NotasModule } from '../notas/notas.module';
import { BoletinPadreService } from './boletin-padre.service';
import {
  BoletinController,
  BoletinPadreController,
  PublicacionesController,
} from './boletin.controller';
import { BoletinService } from './boletin.service';
import { ColaBoletinesService } from './cola-boletines.service';
import { PublicacionesService } from './publicaciones.service';

/** Boletín en PDF (US-07) con su cola (ADR-0006), su publicación y la consulta del padre (US-11). */
@Module({
  imports: [NotasModule, CalculoModule, FamiliasModule],
  controllers: [BoletinController, PublicacionesController, BoletinPadreController],
  providers: [BoletinService, ColaBoletinesService, PublicacionesService, BoletinPadreService],
})
export class BoletinModule {}
