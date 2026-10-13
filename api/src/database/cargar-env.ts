import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga api/.env para los scripts que corren fuera de NestJS (CLI de TypeORM, seed, reinicio de la base).
 * No reemplaza variables que ya existen: en Jenkins y en las pruebas manda el entorno.
 */
export function cargarEnv() {
  const archivo = resolve(__dirname, '../../.env');
  if (existsSync(archivo)) process.loadEnvFile(archivo);
}
