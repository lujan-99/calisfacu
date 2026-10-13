import { reiniciarBase } from '../src/database/reiniciar';

/** Antes de las pruebas e2e: base vacía + todas las migraciones (igual que un despliegue nuevo). */
export default async function globalSetup() {
  await reiniciarBase(
    process.env.DATABASE_URL ?? 'postgresql://calis:calis@localhost:55432/calis_test',
  );
}
