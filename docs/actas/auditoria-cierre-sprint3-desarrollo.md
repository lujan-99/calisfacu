# Acta de auditoría de cierre del Sprint 3: artefactos de desarrollo (T-055)

> SQAP, Tabla 14 y regla de independencia (Sección 3 y ADR-0008): Galvan revisa los artefactos de desarrollo que Lujan
> produjo en el Sprint 3. La auditoría inversa, de las evidencias de prueba, es T-056.
>
> **Estado al 30/10/2026: preparada, pendiente.** La realiza Galvan; Lujan es el autor y no puede auditarse a sí mismo.

- **Fecha y duración:** \_\_\_\_/\_\_\_\_/2026, \_\_\_\_:\_\_\_\_–\_\_\_\_:\_\_\_\_
- **Alcance:** commits de Lujan del Sprint 3 en `develop`, de `91be7b5` a `ce1c8ba` y el commit del cierre (US-06,
  US-07, US-11, US-20; decisiones D17 a D20; ADR-0006).
- **Auditor:** Galvan · **Auditado:** Lujan

## 1. Indicadores

| N.º | Indicador                                       | Se cumple si…                                                                                         | Dónde mirar                                                        | Cumple | Evidencia u observación |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ | ----------------------- |
| 1   | Guard de pertenencia (US-20, RNF-04, M09)       | El padre recibe 403 con un estudiante no vinculado o inexistente, en todas sus rutas                  | `api/src/modules/familias/`, `boletin-padre.service.ts`            |        |                         |
| 2   | Panel de riesgo (US-06)                         | Riesgo según D6 con el umbral de la gestión; nota del trimestre desde el cálculo (D18)                | `api/src/modules/panel/`                                           |        |                         |
| 3   | Boletín (US-07 CA 1)                            | Mismas notas y asistencia que el historial; encabezado con UE, SIE, nivel, año y paralelo (D19)       | `api/src/modules/boletin/`                                         |        |                         |
| 4   | Cola (US-07 CA 3, ADR-0006)                     | El trabajo es de quien lo pidió; aviso al terminar; el worker se cierra con la aplicación             | `cola-boletines.service.ts`                                        |        |                         |
| 5   | Publicación (US-11, D20)                        | Sin publicar, el padre no ve ninguna nota; publicar exige todas las entregas                          | `publicaciones.service.ts`                                         |        |                         |
| 6   | Cálculo solo en `CalculoService` y `decimal.js` | El panel y el boletín no recalculan notas con `float`                                                 | `riesgo.ts`, `boletin.service.ts`, `notas-trimestrales.service.ts` |        |                         |
| 7   | TDD y cobertura (M06)                           | Pruebas en el mismo commit; cobertura ≥ 90 % en los módulos críticos                                  | Historial de git, `api/jest.config.ts`                             |        |                         |
| 8   | Migraciones                                     | Una por cambio de esquema; ninguna fusionada editada                                                  | `api/src/database/migrations/`                                     |        |                         |
| 9   | Rutas nuevas en M09                             | Cada ruta del sprint en `autorizacion.e2e-spec.ts`                                                    | `api/test/autorizacion.e2e-spec.ts`                                |        |                         |
| 10  | Dependencias (M08)                              | pdfkit, bullmq e ioredis justificadas, MIT, en la matriz; msgpackr-extract denegado en `allowScripts` | `api/package.json`, `package.json`, `docs/sqap/matrices-sqap.xlsx` |        |                         |
| 11  | Documentación viva                              | D17 a D20, SAD, ADR-0006 e historias actualizados en los mismos commits                               | `docs/backlog/reglas-ministerio.md`, `docs/sad/`, `docs/adr/`      |        |                         |
| 12  | Frontend contra la API real                     | Sin datos simulados que oculten errores de la API                                                     | `web/src/lib/`, `web/src/pages/`                                   |        |                         |

## 2. Hallazgos

| N.º | Indicador | Descripción | Severidad | Responsable | Issue |
| --- | --------- | ----------- | --------- | ----------- | ----- |
| 1   |           |             |           |             |       |

## 3. Decisión

- [ ] Sin hallazgos
- [ ] Con hallazgos menores (se corrigen en el Sprint 4)
- [ ] Con hallazgos mayores (bloquean el cierre)

## 4. Firmas

| Nombre | Rol en la auditoría | Firma |
| ------ | ------------------- | ----- |
| Galvan | Auditor             |       |
| Lujan  | Auditado            |       |
