import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { opcionesBaseDeDatos } from './database/typeorm.config';
import { AsistenciaModule } from './modules/asistencia/asistencia.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalculoModule } from './modules/calculo/calculo.module';
import { NotasModule } from './modules/notas/notas.module';
import { SaludModule } from './modules/salud/salud.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: () => opcionesBaseDeDatos() }),
    SaludModule,
    AuthModule,
    NotasModule,
    AuditoriaModule,
    CalculoModule,
    AsistenciaModule,
  ],
})
export class AppModule {}
