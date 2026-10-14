# Acta de auditoría de cierre del Sprint 1: evidencias de prueba (T-026)

> Preparada con la Tabla 14 del SQAP. Lujan (auditor) la completa el día 5 del sprint revisando cada evidencia en su
> ubicación; Galvan (auditado) responde los hallazgos. Al cerrarla se renombra con la fecha:
> `AAAA-MM-DD-auditoria-cierre-sprint1-pruebas.md`. La auditoría inversa (Galvan audita los artefactos de desarrollo
> de Lujan) es T-025 y va en su propia acta.

- **Fecha y duración:** \_\_\_\_/\_\_\_\_/2026, \_\_\_\_:\_\_\_\_–\_\_\_\_:\_\_\_\_
- **Alcance:** evidencias de prueba del Sprint 1 producidas por Galvan: pipeline de Jenkins (T-007, T-029), E2E de
  Cypress (T-013, T-021), despliegue a staging y smoke test (T-028), y las pruebas de frontend (T-012, T-020, T-024).
- **Auditor:** Lujan · **Auditado:** Galvan
- **Build auditado:** último build de `develop` en SUCCESS al cierre del sprint: N.º \_\_\_\_ (commit \_\_\_\_\_\_\_).
  En Sprint 1 todavía no hay release en `main`, así que los indicadores del build sano se verifican sobre `develop`.

## Indicadores del build sano y del pipeline (SQAP, Tabla 14)

| N.º | Indicador              | Se cumple si…                                                                      | Dónde mirar                                                                          | Cumple | Evidencia |
| --- | ---------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ | --------- |
| 1   | Resultado              | SUCCESS en el último build, en la Stage View                                       | Jenkins → calisfacu → develop → Stage View                                           |        |           |
| 2   | Pruebas ejecutadas     | Más de cero y las mismas que corren en local                                       | Test Result del build vs. `npm run -w api test:cov` y `npm run -w web test -- --run` |        |           |
| 3   | Pruebas fallidas       | 0 fallos y 0 errores; informe JUnit publicado                                      | Test Result Trend del job                                                            |        |           |
| 4   | Artefacto              | El paquete del build está archivado y asociado al build                            | Build Artifacts del build                                                            |        |           |
| 5   | Reproducibilidad       | Todo el pipeline está en el Jenkinsfile; el job solo tiene la URL del repositorio  | `Jenkinsfile`, `jenkins/casc.yaml` (job-dsl)                                         |        |           |
| 6   | Cobertura              | Exigida por la herramienta (M05, M06), no solo medida                              | `api/jest.config.ts` (coverageThreshold) y consola de la etapa de pruebas            |        |           |
| 7   | E2E                    | Cypress ejecutó todos sus escenarios y pasaron (M02)                               | Etapa E2E: `inicio-sesion.cy.ts`, `registrar-calificacion.cy.ts`; informe JUnit      |        |           |
| 8   | Orden                  | Las etapas de despliegue van después de las de prueba y solo corren si estas pasan | Stage View y `Jenkinsfile`                                                           |        |           |
| 9   | Disparo automático     | Un push inicia el build sin clic en 3 minutos o menos                              | Hora del push vs. hora de inicio del build (escaneo cada minuto)                     |        |           |
| 10  | Verificación posterior | El smoke test pasa y el commit desplegado es el del build                          | Etapa Smoke test; `GET /api/salud` en staging devuelve el mismo commit               |        |           |
| 11  | Secretos               | Ninguno en el repositorio ni impreso en la consola de Jenkins                      | `git grep` de claves y Deploy Hooks; consola del build (deben salir `****`)          |        |           |
| 12  | Hooks                  | Husky activo: un mensaje fuera de Conventional Commits se rechaza en local         | Probar `git commit -m "cambios"` en un clon limpio                                   |        |           |

## Indicadores del plan verificable que tocan las pruebas (SQAP, Tabla 14)

| N.º | Indicador                | Se cumple si…                                                                 | Dónde mirar                                                     | Cumple | Evidencia |
| --- | ------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ | --------- |
| 13  | Asignado e independiente | Nadie aprobó su propio artefacto                                              | Comentarios de revisión en los commits de GitHub (ADR-0008)     |        |           |
| 14  | Trazable                 | Cada criterio de aceptación del Sprint 1 tiene su prueba, con nombre "debe…"  | Historias US-01, US-02, US-17, US-18 vs. `*.spec.ts`, `*.cy.ts` |        |           |
| 15  | Evidenciable             | Las evidencias de la Sección 12 del SQAP del Sprint 1 existen en su ubicación | `docs/evidencias/`, artefactos de Jenkins                       |        |           |

## Observación conocida antes de auditar

Parte de la infraestructura y de las pruebas asignadas a Galvan (T-005 a T-007, T-028, T-029 y los arreglos del E2E de
la planilla) la escribió Lujan para tener el despliegue continuo desde el Sprint 1. Para que el indicador 13 se cumpla,
Galvan debe revisar esos commits y dejar el comentario de revisión en GitHub antes de la auditoría, y Lujan no puede
auditar como evidencia de Galvan lo que escribió en persona: esos puntos se anotan como hallazgo si siguen sin revisar.

## Hallazgos

| N.º | Indicador | Descripción | Severidad (mayor/menor) | Responsable | Issue |
| --- | --------- | ----------- | ----------------------- | ----------- | ----- |
| 1   |           |             |                         | Galvan      |       |
| 2   |           |             |                         | Galvan      |       |

## Decisión

- [ ] Sin hallazgos · [ ] Con hallazgos menores (se corrigen en el Sprint 2) · [ ] Con hallazgos mayores (bloquean el cierre)

## Firmas

| Nombre | Rol      | Firma |
| ------ | -------- | ----- |
| Lujan  | Auditor  |       |
| Galvan | Auditado |       |
