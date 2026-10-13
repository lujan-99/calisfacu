import { DataSource } from 'typeorm';
import { opcionesBaseDeDatos } from '../src/database/typeorm.config';

/**
 * Las migraciones y las entidades describen el mismo esquema. Si no, `db:migration:generate` produciría cambios
 * no pedidos (por ejemplo, borrar las restricciones CHECK que no están declaradas en las entidades).
 */
describe('Esquema de la base (ADR-0002)', () => {
  const ds = new DataSource(opcionesBaseDeDatos());

  beforeAll(() => ds.initialize());
  afterAll(() => ds.destroy());

  it('debe coincidir con las entidades después de aplicar las migraciones', async () => {
    const pendientes = await ds.driver.createSchemaBuilder().log();
    expect(pendientes.upQueries.map((q) => q.query)).toEqual([]);
  });
});
