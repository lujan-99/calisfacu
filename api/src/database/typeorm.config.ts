import type { DataSourceOptions } from 'typeorm';
import { ENTIDADES } from './entities';
import { SnakeNamingStrategy } from './naming.strategy';

/** Configuración única de TypeORM: la usan la aplicación, la CLI de migraciones, el seed y las pruebas e2e. */
export function opcionesBaseDeDatos(url = process.env.DATABASE_URL): DataSourceOptions {
  if (!url) throw new Error('Falta la variable DATABASE_URL');
  return {
    type: 'postgres',
    url,
    entities: ENTIDADES,
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    logging: process.env.NODE_ENV === 'test' ? false : ['error'],
  };
}
