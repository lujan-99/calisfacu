// Fuente de datos para la CLI de TypeORM: npm run -w api typeorm -- migration:run
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { opcionesBaseDeDatos } from './typeorm.config';

export default new DataSource(opcionesBaseDeDatos());
