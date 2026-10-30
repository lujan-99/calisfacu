import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gestion, Trimestre, VinculoPadre } from '../../database/entities';
import { GestionesService } from '../academico/gestiones.service';
import { AccesoFamiliarService } from './acceso-familiar.service';
import {
  HijosController,
  PadresController,
  VinculosFamiliaresController,
} from './familias.controller';
import { VinculosService } from './vinculos.service';

/** Vinculación padre–estudiante (US-20). Exporta el guard de pertenencia para el boletín del padre (US-11). */
@Module({
  imports: [TypeOrmModule.forFeature([Gestion, Trimestre, VinculoPadre])],
  controllers: [PadresController, VinculosFamiliaresController, HijosController],
  providers: [GestionesService, VinculosService, AccesoFamiliarService],
  exports: [AccesoFamiliarService],
})
export class FamiliasModule {}
