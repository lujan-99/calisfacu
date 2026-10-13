// Fuente de datos para la CLI de TypeORM: npm run -w api typeorm -- migration:run
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { cargarEnv } from './cargar-env';
import { opcionesBaseDeDatos } from './typeorm.config';

cargarEnv();
export default new DataSource(opcionesBaseDeDatos());
