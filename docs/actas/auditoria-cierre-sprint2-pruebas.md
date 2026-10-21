# Acta de auditoría de cierre del Sprint 2: evidencias de prueba (T-042)

> Preparada con la Tabla 14 del SQAP. Lujan (auditor) la completa revisando cada evidencia en su
> ubicación; Galvan (auditado) responde por las evidencias producidas.
> La auditoría inversa de desarrollo es T-041.

- **Fecha y duración:** 20/10/2026, 18:00–19:00
- **Alcance:** evidencias de prueba del Sprint 2 producidas por Galvan: suites de frontend (Vitest),
  escenarios E2E de Cypress (US-04, US-03, US-05, US-19, US-10), control estático (ESLint, Prettier)
  y reportes JUnit archivados en `docs/evidencias/sprint2/`.
- **Auditor:** Lujan · **Auditado:** Galvan
- **Rama auditada:** `develop`.

---

## 1. Indicadores del Build y Evidencias de Prueba (SQAP, Tabla 14)

| N.º | Indicador                               | Se cumple si…                                                    | Dónde mirar                                                   | Cumple | Evidencia                                                                             |
| :-: | :-------------------------------------- | :--------------------------------------------------------------- | :------------------------------------------------------------ | :----: | :------------------------------------------------------------------------------------ |
|  1  | **Pruebas ejecutadas**                  | Más de cero y las mismas que corren en local                     | Test Results vs `npm run -w web test` y `npm run -w api test` | **SÍ** | 127 pruebas Web + 39 API ejecutadas (166 en total)                                    |
|  2  | **Pruebas fallidas**                    | 0 fallos y 0 errores; informes JUnit publicados                  | `docs/evidencias/sprint2/junit-web.xml` y `junit-api.xml`     | **SÍ** | 0 fallos, 0 errores (100 % éxito en 17 suites)                                        |
|  3  | **Escenarios E2E Cypress (M02)**        | Cypress ejecutó todos sus escenarios y pasaron                   | `e2e/cypress/e2e/` (7 suites E2E completas)                   | **SÍ** | M02 al 100 % (inicio, notas, corrección, historial, importación, asistencia, control) |
|  4  | **Reglas de cálculo (M01)**             | 100 % de los casos de la tabla y RM 001/2026                     | `junit-api.xml` (`CalculoService`)                            | **SÍ** | 19 casos oficiales y unitarios en verde                                               |
|  5  | **Cobertura de código nuevo (M05)**     | Cobertura en código nuevo $\ge 80\%$                             | Vitest y Jest coverage reports                                | **SÍ** | Cobertura $\ge 88\%$ en código agregado                                               |
|  6  | **Cobertura en módulos críticos (M06)** | Cobertura de líneas $\ge 90\%$ por módulo                        | `api/jest.config.ts` (`coverageThreshold`)                    | **SÍ** | $\ge 90\%$ verificado en `notas`, `calculo`, `auth`, `auditoria`                      |
|  7  | **Lint y formato (M16)**                | 0 errores y 0 advertencias de linter y formato                   | `eslint . --max-warnings=0`                                   | **SÍ** | 0 errores y 0 warnings en todo el monorepo                                            |
|  8  | **Seguridad de dependencias (M08)**     | Cero vulnerabilidades altas o críticas                           | `npm audit --audit-level=high`                                | **SÍ** | 0 vulnerabilidades reportadas                                                         |
|  9  | **Trazabilidad de aceptación**          | Cada criterio de aceptación del Sprint 2 tiene su prueba "debe…" | Historias US-03, US-04, US-05, US-10, US-19 vs suites         | **SÍ** | 100 % de criterios con pruebas automáticas                                            |
| 10  | **Evidencias archivadas**               | Evidencias requeridas en su carpeta duradera                     | `docs/evidencias/sprint2/`                                    | **SÍ** | `informe-pruebas-sprint2.md`, `junit-web.xml`, `junit-api.xml`                        |

---

## 2. Hallazgos

| N.º | Indicador | Descripción                                                          | Severidad | Responsable | Issue |
| :-: | :-------- | :------------------------------------------------------------------- | :-------: | :---------: | :---: |
|  1  | Ninguno   | Las pruebas cubren exhaustivamente todos los criterios del Sprint 2. |   Menor   |      —      |   —   |

---

## 3. Decisión

- [x] **Sin hallazgos (aprobado)**
- [ ] Con hallazgos menores (se corrigen en Sprint 3)
- [ ] Con hallazgos mayores (bloquean el cierre)

---

## 4. Firmas

| Nombre     | Rol en la Auditoría | Rol en el Proyecto               | Firma    |
| :--------- | :------------------ | :------------------------------- | :------- |
| **Lujan**  | Auditor             | Líder / Arquitecto / Dev Backend | _Lujan_  |
| **Galvan** | Auditado            | Responsable SQA / Dev Frontend   | _Galvan_ |
