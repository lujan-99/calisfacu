// Borra todo el esquema y aplica las migraciones desde cero. SOLO para desarrollo y pruebas:
// se niega a ejecutarse con NODE_ENV=production.
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { cargarEnv } from './cargar-env';
import { opcionesBaseDeDatos } from './typeorm.config';

/** Crea la base de la URL si todavía no existe (calis_test y calis_ci no las crea docker-compose). */
async function crearSiFalta(url: string) {
  const destino = new URL(url);
  const nombre = decodeURIComponent(destino.pathname.slice(1));
  destino.pathname = '/postgres';
  const admin = await new DataSource({ type: 'postgres', url: destino.toString() }).initialize();
  try {
    const filas = await admin.query<unknown[]>('SELECT 1 FROM pg_database WHERE datname = $1', [
      nombre,
    ]);
    if (filas.length === 0) await admin.query(`CREATE DATABASE "${nombre.replaceAll('"', '""')}"`);
  } finally {
    await admin.destroy();
  }
}

export async function reiniciarBase(url = process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('No se reinicia una base de producción');
  if (!url) throw new Error('Falta la variable DATABASE_URL');
  await crearSiFalta(url);
  const ds = await new DataSource(opcionesBaseDeDatos(url)).initialize();
  await ds.query('DROP SCHEMA public CASCADE');
  await ds.query('CREATE SCHEMA public');
  await ds.runMigrations();
  await ds.destroy();
}

if (require.main === module) {
  cargarEnv();
  reiniciarBase()
    .then(() => console.warn('Base reiniciada y migrada'))
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}
