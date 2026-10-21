# Acta de auditoría de cierre del Sprint 2: artefactos de desarrollo (T-041)

> SQAP, Tabla 14 y regla de independencia (Sección 3 y ADR-0008): alguien que no sea el autor revisa los artefactos
> de desarrollo del Sprint 2. La auditoría inversa, de las evidencias de prueba, es T-042.
>
> **Estado al 21/10/2026: pendiente, sin auditor.** El auditor previsto era Galvan, que ya no participa en el proyecto.
> Lujan es el autor y no puede auditarse a sí mismo. La versión anterior de esta acta la daba por hecha el 20/10/2026,
> "sin observaciones" y con la firma de Lujan; se reemplaza porque esa auditoría no se realizó.

- **Fecha y duración:** \_\_\_\_/\_\_\_\_/2026, \_\_\_\_:\_\_\_\_–\_\_\_\_:\_\_\_\_
- **Alcance:** commits del Sprint 2 en `develop` desde `9cdec41` hasta el commit auditado \_\_\_\_\_\_\_ (US-03, US-04,
  US-05, US-10, US-19, decisiones D12 a D16).
- **Auditor:** \_\_\_\_\_\_\_\_\_\_\_\_ · **Auditado:** Lujan

## 1. Indicadores

| N.º | Indicador                                         | Se cumple si…                                                                              | Dónde mirar                                      | Cumple | Evidencia u observación |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------ | ----------------------- |
| 1   | Corrección auditable (US-04, RNF-04, M15)         | Motivo obligatorio; auditoría en la misma transacción; exige solicitud aprobada (D16)      | `api/src/modules/auditoria/`                     |        |                         |
| 2   | Historial (US-03, M09)                            | 403 si el profesor no da clases al estudiante; promedios según D12                         | `historial.service.ts`, `acceso.service.ts`      |        |                         |
| 3   | Importación (US-05)                               | El .xlsx se lee en la API; filas con error con su motivo; auditoría IMPORTACION (D14)      | `api/src/modules/importacion/`                   |        |                         |
| 4   | Entrega de notas (US-10)                          | Entrega solo con todas las notas; una por materia y trimestre (D13)                        | `api/src/modules/entregas/`                      |        |                         |
| 5   | Cálculo solo en `CalculoService` con `decimal.js` | Ningún promedio con `float` fuera del servicio                                             | `calculo.service.ts`, `historial.service.ts`     |        |                         |
| 6   | TDD en módulos críticos (M06)                     | La prueba aparece antes o en el mismo commit; cobertura ≥ 90 %                             | Historial de git, `api/jest.config.ts`           |        |                         |
| 7   | Migraciones                                       | `synchronize: false`; una migración nueva por cambio de esquema; ninguna fusionada editada | `api/src/database/migrations/`                   |        |                         |
| 8   | Rutas nuevas en M09                               | Cada ruta del sprint en `autorizacion.e2e-spec.ts`                                         | `api/test/autorizacion.e2e-spec.ts`              |        |                         |
| 9   | Datos sintéticos y de menores                     | Sin datos reales; nada personal en `localStorage`                                          | `seed.ts`, fixtures, `web/src/lib/`              |        |                         |
| 10  | Dependencias                                      | exceljs justificada, con licencia y fila en la hoja Componentes de terceros                | `package.json`, `docs/sqap/matrices-sqap.xlsx`   |        |                         |
| 11  | Documentación viva                                | Decisiones D12 a D16, SAD y backlog actualizados en los mismos commits                     | `docs/backlog/reglas-ministerio.md`, `docs/sad/` |        |                         |

## 2. Hallazgos

| N.º | Indicador | Descripción | Severidad | Responsable | Issue |
| --- | --------- | ----------- | --------- | ----------- | ----- |
| 1   |           |             |           |             |       |

## 3. Decisión

- [ ] Sin hallazgos
- [ ] Con hallazgos menores (se corrigen en el Sprint 3)
- [ ] Con hallazgos mayores (bloquean el cierre)

## 4. Firmas

| Nombre | Rol en la auditoría | Firma |
| ------ | ------------------- | ----- |
|        | Auditor             |       |
| Lujan  | Auditado            |       |
