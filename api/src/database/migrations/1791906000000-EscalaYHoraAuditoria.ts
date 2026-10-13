import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Decisiones del 13/10/2026 (docs/backlog/reglas-ministerio.md):
 *  - La escala es de 1 a 100, sin 0: la base exige lo mismo que la API (antes admitía 0).
 *  - La hora de un registro de auditoría es la del cambio (clock_timestamp), no la de inicio de la transacción.
 */
export class EscalaYHoraAuditoria1791906000000 implements MigrationInterface {
  name = 'EscalaYHoraAuditoria1791906000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE notas DROP CONSTRAINT notas_valor_escala`);
    await q.query(
      `ALTER TABLE notas ADD CONSTRAINT notas_valor_escala CHECK (valor >= 1 AND valor <= 100)`,
    );
    await q.query(
      `ALTER TABLE registros_auditoria ALTER COLUMN creado_en SET DEFAULT clock_timestamp()`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE registros_auditoria ALTER COLUMN creado_en SET DEFAULT now()`);
    await q.query(`ALTER TABLE notas DROP CONSTRAINT notas_valor_escala`);
    await q.query(
      `ALTER TABLE notas ADD CONSTRAINT notas_valor_escala CHECK (valor >= 0 AND valor <= 100)`,
    );
  }
}
