# Informe de pruebas — Sprint 2

> SQAP, Secciones 7 y 12 (Tabla 8). Rehecho el 21/10/2026 por Lujan con resultados ejecutados ese día. Reemplaza la
> versión del 20/10/2026, que daba por cumplidas métricas que no se cumplían (ver la sección 6 y el acta T-042).

- **Rama:** `develop`, commit `6216e1b`
- **Build de Jenkins:** develop N.º 25 en SUCCESS (pruebas, build, despliegue a staging, smoke test y E2E contra
  staging). El análisis estático no corrió: SonarQube Cloud todavía no está configurado (T-030).
- **Evidencias archivadas:** `junit-api.xml` y `junit-web.xml` de esta carpeta, generados con el commit anterior.

## 1. Alcance

| Historia                                | Qué se probó                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| US-04 Corrección auditable              | Motivo obligatorio, auditoría de solo inserción en la misma transacción, recálculo; solicitud de edición aprobada (D16)          |
| US-03 Historial académico               | Trimestres en orden con notas y promedios (D12); 403 si el estudiante no cursa materias del profesor                             |
| US-19 Registro de asistencia            | Presente, ausente o licencia por clase; porcentaje D5; sin fechas futuras en Bolivia (D8)                                        |
| US-05 Importación desde Excel           | Plantilla .xlsx, vista previa con filas válidas y con error, confirmación con auditoría de origen IMPORTACION (D14)              |
| US-10 Control de entrega de notas       | Estado por curso y materia; entrega solo con todas las notas (D13)                                                               |
| Ajustes pedidos en la guía del frontend | CI opcional del estudiante (D15); solicitudes de edición que aprueba el administrador (D16), ambos guardados en la base de datos |

## 2. Métricas

| ID  | Métrica                                                  | Umbral | Resultado                                                                                      | Cumple    |
| --- | -------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- | --------- |
| M01 | Casos de cálculo de la tabla firmada que pasan           | 100 %  | 100 % (`calculo.casos.spec.ts`, en `junit-api.xml`)                                            | Sí        |
| M02 | Escenarios E2E críticos que pasan                        | 100 %  | 22 de 22 en local y en Jenkins contra staging (build 25)                                       | Sí        |
| M05 | Cobertura de líneas del código nuevo                     | ≥ 80 % | Sin SonarQube Cloud no se mide "código nuevo". Total: API 98,7 %, web 86,2 % de líneas         | Parcial   |
| M06 | Cobertura de líneas por módulo crítico                   | ≥ 90 % | auth 98,6 %, notas 100 %, calculo 100 %, auditoria 100 % (`coverageThreshold` de Jest)         | Sí        |
| M07 | Duplicación en código nuevo                              | ≤ 3 %  | No medida: requiere SonarQube Cloud (T-030)                                                    | No medida |
| M08 | Vulnerabilidades altas o críticas                        | 0      | `npm audit --audit-level=high`: 0 altas (21 moderadas); Dependabot activo: 2 alertas moderadas | Sí        |
| M09 | Rutas protegidas que rechazan con 401 y 403              | 100 %  | `autorizacion.e2e-spec.ts` incluye todas las rutas nuevas del sprint                           | Sí        |
| M15 | Cambios de nota con auditoría completa de solo inserción | 100 %  | Registro, corrección e importación: `auditoria`, `importacion` y `solicitudes` e2e             | Sí        |
| M16 | Errores y advertencias de lint y formato                 | 0      | `eslint . --max-warnings=0` y `prettier --check .` sin observaciones                           | Sí        |

## 3. API (Jest + Supertest con PostgreSQL real)

`npm run -w api test:cov`: **214 pruebas en 17 suites, 0 fallos** (6 suites unitarias y 11 e2e).

| Módulo      | Líneas cubiertas |
| ----------- | ---------------- |
| academico   | 98,7 %           |
| asistencia  | 100 %            |
| auditoria   | 100 %            |
| auth        | 98,6 %           |
| calculo     | 100 %            |
| entregas    | 96,6 %           |
| importacion | 98,5 %           |
| notas       | 100 %            |

Suites nuevas o ampliadas en el sprint: `historial`, `entregas`, `importacion`, `solicitudes` (e2e) y
`reglas-entregas`, `reglas-importacion` (unitarias); `auditoria`, `notas`, `academico` y `autorizacion` ampliadas.

## 4. Web (Vitest + Testing Library)

`npm run -w web test -- --run`: **123 pruebas en 11 archivos, 0 fallos**. Cobertura: 86,2 % de líneas, 81,1 % de
ramas.

## 5. E2E (Cypress)

22 escenarios en 7 archivos, en verde en local (base `calis_e2e` con el seed) y en Jenkins contra staging:
`inicio-sesion` (7), `registrar-calificacion` (2), `correccion-auditable` (3, incluye el flujo completo de la
solicitud de edición), `historial-academico` (2), `importar-notas` (2), `registro-asistencia` (3) y
`control-entregas` (3).

## 6. Defectos encontrados y corregidos durante el cierre

| N.º | Defecto                                                                                                                          | Corrección                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | `npm run -w web build` fallaba por errores de tipos: los builds 20 a 22 de Jenkins quedaron en FAILURE y staging no se actualizó | `803be2e`                                                                                          |
| 2   | La corrección nunca llamaba a la API (la planilla no traía `notaId`) y la "auditoría" quedaba en `localStorage`                  | `803be2e`: la API devuelve `notaId` y la web corrige y lee el historial contra la API              |
| 3   | La importación leía el archivo en el navegador como CSV y auditaba en `localStorage` (incumplía US-05 CA 3)                      | `1ea52ba`: lectura y validación del .xlsx en la API con exceljs, auditoría en la misma transacción |
| 4   | La pantalla de control de entregas llamaba a `/api/entregas`, que no existía                                                     | `9b86517`                                                                                          |
| 5   | Tres archivos Cypress usaban selectores que no existen; nunca pudieron pasar                                                     | `186515b`                                                                                          |
| 6   | La prueba de importación dependía de los RUDE del seed local y fallaba en staging                                                | `45c6a82`: usa la plantilla que entrega la API                                                     |
| 7   | CI de los estudiantes (datos de menores) y tickets de edición guardados en `localStorage`                                        | `841775d` y `6216e1b`: en la base de datos (D15, D16)                                              |

## 7. Pendiente

- **T-030:** SonarQube Cloud (M05 sobre código nuevo y M07). Dependabot ya está activo y apunta a `develop`.
- **T-041 y T-027:** necesitan un revisor independiente del autor (SQAP, Sección 3).
- **Revisión del sprint con el cliente:** no se realizó; el acta `revision-sprint2.md` queda preparada.
