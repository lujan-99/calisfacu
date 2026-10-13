import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * US-04 y M15: el registro de auditoría es de solo inserción. Este trigger rechaza UPDATE y DELETE
 * incluso si alguien lo intenta directamente en la base. Se agregan además restricciones de dominio.
 */
export class AuditoriaInmutable1791866200000 implements MigrationInterface {
  name = 'AuditoriaInmutable1791866200000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE FUNCTION rechazar_cambio_auditoria() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'El registro de auditoría es de solo inserción (US-04)';
      END;
      $$ LANGUAGE plpgsql`);
    await q.query(`
      CREATE TRIGGER registros_auditoria_inmutable
      BEFORE UPDATE OR DELETE ON registros_auditoria
      FOR EACH ROW EXECUTE FUNCTION rechazar_cambio_auditoria()`);
    await q.query(
      `ALTER TABLE notas ADD CONSTRAINT notas_valor_escala CHECK (valor >= 0 AND valor <= 100)`,
    );
    await q.query(
      `ALTER TABLE dimensiones_evaluacion ADD CONSTRAINT dimensiones_puntaje_positivo CHECK (puntaje_maximo > 0)`,
    );
    await q.query(
      `ALTER TABLE trimestres ADD CONSTRAINT trimestres_numero CHECK (numero BETWEEN 1 AND 3)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE trimestres DROP CONSTRAINT trimestres_numero`);
    await q.query(
      `ALTER TABLE dimensiones_evaluacion DROP CONSTRAINT dimensiones_puntaje_positivo`,
    );
    await q.query(`ALTER TABLE notas DROP CONSTRAINT notas_valor_escala`);
    await q.query(`DROP TRIGGER registros_auditoria_inmutable ON registros_auditoria`);
    await q.query(`DROP FUNCTION rechazar_cambio_auditoria()`);
  }
}
