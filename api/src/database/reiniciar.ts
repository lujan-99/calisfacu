// Borra todo el esquema y aplica las migraciones desde cero. SOLO para desarrollo y pruebas:
// se niega a ejecutarse con NODE_ENV=production.
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { opcionesBaseDeDatos } from './typeorm.config';

export async function reiniciarBase(url = process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('No se reinicia una base de producción');
  const ds = await new DataSource(opcionesBaseDeDatos(url)).initialize();
  await ds.query('DROP SCHEMA public CASCADE');
  await ds.query('CREATE SCHEMA public');
  await ds.runMigrations();
  await ds.destroy();
}

if (require.main === module) {
  reiniciarBase()
    .then(() => console.warn('Base reiniciada y migrada'))
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}
