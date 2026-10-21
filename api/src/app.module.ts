import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { opcionesBaseDeDatos } from './database/typeorm.config';
import { AcademicoModule } from './modules/academico/academico.module';
import { AsistenciaModule } from './modules/asistencia/asistencia.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalculoModule } from './modules/calculo/calculo.module';
import { EntregasModule } from './modules/entregas/entregas.module';
import { NotasModule } from './modules/notas/notas.module';
import { SaludModule } from './modules/salud/salud.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: () => opcionesBaseDeDatos() }),
    SaludModule,
    AuthModule,
    AcademicoModule,
    NotasModule,
    AuditoriaModule,
    CalculoModule,
    AsistenciaModule,
    EntregasModule,
  ],
})
export class AppModule {}
