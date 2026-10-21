import { Module } from '@nestjs/common';
import { NotasModule } from '../notas/notas.module';
import { EntregasController } from './entregas.controller';
import { EntregasService } from './entregas.service';

@Module({
  imports: [NotasModule],
  controllers: [EntregasController],
  providers: [EntregasService],
})
export class EntregasModule {}
