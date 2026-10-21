# Acta de auditoría de cierre del Sprint 2: evidencias de prueba (T-042)

> SQAP, Tabla 14. Lujan (auditor) revisa las evidencias de prueba que Galvan (auditado) produjo para el Sprint 2.
> La auditoría inversa, de los artefactos de desarrollo, es T-041.
>
> Esta acta reemplaza la versión del 20/10/2026, que figuraba "Sin hallazgos (aprobado)" con la firma de Lujan, pero
> que Lujan no realizó ni firmó.

- **Fecha:** 21/10/2026
- **Alcance:** lo que Galvan entregó para el Sprint 2 hasta el commit `9cdec41`: pruebas de la web (Vitest),
  escenarios Cypress, informe `informe-pruebas-sprint2.md` y JUnit archivados en `docs/evidencias/sprint2/`.
- **Auditor:** Lujan · **Auditado:** Galvan (ya no participa en el proyecto; no pudo responder los hallazgos)
- **Método:** se ejecutaron las suites en local (API, web y Cypress contra la API y la web locales) y se revisaron los
  builds 20 a 22 de Jenkins.

## 1. Indicadores (SQAP, Tabla 14)

| N.º | Indicador                        | Se cumple si…                                                            | Cumple         | Evidencia                                                                                                                                      |
| --- | -------------------------------- | ------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pruebas ejecutadas               | Más de cero y las mismas que corren en local                             | No             | El build de la web no compilaba: Jenkins no llegó a ejecutar las pruebas de esos commits (builds 20 a 22)                                      |
| 2   | Pruebas fallidas                 | 0 fallos y JUnit publicados                                              | No             | `junit-api.xml` archivado con 39 pruebas, sin las e2e: no corresponde a la ejecución de la API                                                 |
| 3   | Escenarios E2E (M02)             | Cypress ejecutó todos sus escenarios y pasaron                           | No             | 3 de 7 archivos fallaban: selectores inexistentes (`btn-ver-notas-trimestre`, `btn-asistencia-materia`) y un aviso que la planilla no mostraba |
| 4   | Reglas de cálculo (M01)          | 100 % de los casos de la tabla                                           | Sí             | `calculo.casos.spec.ts` en verde                                                                                                               |
| 5   | Cobertura código nuevo (M05)     | ≥ 80 % en código nuevo                                                   | No verificable | El informe declaraba "≥ 88 %" sin SonarQube Cloud configurado                                                                                  |
| 6   | Cobertura módulos críticos (M06) | ≥ 90 % por módulo                                                        | Sí             | `coverageThreshold` de Jest                                                                                                                    |
| 7   | Lint y formato (M16)             | 0 errores y 0 advertencias                                               | Sí             | Sí en ESLint y Prettier; los errores de tipos de la web no los detecta el lint                                                                 |
| 8   | Dependencias (M08)               | 0 altas o críticas                                                       | Sí             | `npm audit --audit-level=high`                                                                                                                 |
| 9   | Trazabilidad de aceptación       | Cada criterio tiene una prueba "debe…" que prueba el comportamiento real | No             | Las pruebas de la web simulaban un `notaId` que la API no enviaba y validaban una auditoría en `localStorage`                                  |
| 10  | Evidencias archivadas            | Evidencias en su carpeta, fieles a la ejecución                          | No             | El informe declaraba M02 al 100 % y T-030, T-041 y T-042 cumplidas                                                                             |

## 2. Hallazgos

| N.º | Indicador | Descripción                                                                                             | Severidad | Estado                             |
| --- | --------- | ------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------- |
| 1   | 1         | La web no compilaba (`tsc -b`): pipeline en FAILURE y staging sin actualizar desde el build 19          | Mayor     | Corregido en `803be2e`             |
| 2   | 9         | La corrección de notas (US-04) no llegaba a la API; la auditoría y los tickets vivían en `localStorage` | Crítica   | Corregido en `803be2e` y `6216e1b` |
| 3   | 9         | La importación (US-05) no leía .xlsx ni auditaba en la base                                             | Crítica   | Corregido en `1ea52ba`             |
| 4   | 3         | Escenarios Cypress que no podían pasar                                                                  | Mayor     | Corregido en `186515b` y `45c6a82` |
| 5   | 2, 10     | Informe y JUnit del Sprint 2 sin relación con la ejecución real                                         | Mayor     | Rehechos el 21/10/2026             |
| 6   | 10        | Actas de T-041, T-042 y de la revisión con el cliente llenadas y firmadas sin haberse realizado         | Mayor     | Reemplazadas el 21/10/2026         |
| 7   | 5         | M05 y M07 sin medir: SonarQube Cloud no está configurado (T-030)                                        | Menor     | Abierto                            |

Las mismas observaciones aplican a las actas del Sprint 1 que Galvan completó el 19/10/2026 (T-025, T-026 y la
revisión del Sprint 1); quedan para revisar.

## 3. Decisión

- [ ] Sin hallazgos (aprobado)
- [ ] Con hallazgos menores (se corrigen en el Sprint 3)
- [x] **Con hallazgos mayores (bloquean el cierre)**: los hallazgos 1 a 6 se corrigieron el 21/10/2026. El 7 sigue
      abierto.

**Limitación de independencia:** Lujan escribió las correcciones de los hallazgos 1 a 6, así que esta auditoría no
puede darlas por verificadas: las debe revisar alguien independiente, junto con T-041.

## 4. Firmas

| Nombre | Rol en la auditoría | Firma                              |
| ------ | ------------------- | ---------------------------------- |
| Lujan  | Auditor             |                                    |
| Galvan | Auditado            | (no participa desde el 21/10/2026) |
