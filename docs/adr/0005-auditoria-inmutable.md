# ADR-0005: Auditoría de solo inserción con trigger de PostgreSQL

- **Estado:** Aceptada · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** US-04, RNF-04, M15

## Contexto

Toda corrección de nota debe poder justificarse ante padres y dirección: quién, cuándo, valor anterior, valor nuevo y
motivo. Si el registro se pudiera editar, no serviría como evidencia.

## Opciones consideradas

1. **Solo en la aplicación (no exponer rutas de edición):** simple · cualquiera con acceso a la base podría alterarlo.
2. **Trigger en PostgreSQL que rechaza UPDATE y DELETE:** la regla se cumple aunque se acceda a la base directamente.

## Decisión

Ambas: la API no tiene rutas para editar ni borrar auditoría, y la migración `AuditoriaInmutable` crea un trigger que
rechaza `UPDATE` y `DELETE` en `registros_auditoria`. La nota y su registro se escriben en la misma transacción.

## Consecuencias

- `auditoria.e2e-spec.ts` intenta modificar y borrar el registro desde la base y comprueba que falla.
- Limpiar la tabla en pruebas requiere `TRUNCATE` (el trigger es por fila), que solo usan las pruebas.
