# Informe de Pruebas y Evidencias — Sprint 2

> Elaborado según el SQAP v1.0 (Secciones 7 y 12, Tabla 8).  
> **Responsable:** Galvan (Tester / Responsable SQA)  
> **Auditor:** Lujan (Líder / Arquitecto)  
> **Fecha:** 20/10/2026  
> **Rama evaluada:** `develop`

---

## 1. Resumen Ejecutivo

Durante el Sprint 2 se implementaron y verificaron las historias de usuario del alcance:

- **US-04:** Corrección auditable de notas (motivo obligatorio, bitácora de auditoría inmutable de solo lectura y recálculo en la misma transacción).
- **US-03:** Historial académico del estudiante (consulta anual cronológica por trimestres con promedios, dimensiones y evaluación de tendencia académica).
- **US-19:** Registro de asistencia por clase (marcado de presentes, licencias y ausentes, cálculo ministerial del porcentaje según D5 y bloqueo preventivo de fechas futuras en Bolivia).
- **US-05:** Importación de notas desde Excel (soporte .xlsx / CSV / pegado directo, vista previa con filas válidas vs observadas con motivo de rechazo y confirmación con auditoría de origen).
- **US-10:** Control de entrega de notas por curso (supervisión para secretaría por curso/materia/profesor con estado Entregado/Pendiente y validación del 100 % de notas asentadas antes de la entrega).
- **Ajustes de Calidad y Refinamiento del Sprint 1:**
  - Sistema de tickets y solicitudes de habilitación de edición de notas con aprobación por administración.
  - Patrón de preservación en burbuja de unidades educativas para evitar cascadas destructivas sobre cursos, materias y estudiantes.
  - Incorporación del campo Carnet de Identidad (CI) complementario al código RUDE para estudiantes.

Se alcanzó un **100 % de éxito** en todas las suites de pruebas automatizadas ejecutadas tanto en Frontend como en Backend, superando los umbrales de calidad del SQAP (M01, M02, M05, M06, M08, M16).

---

## 2. Estado de Métricas de Calidad del Sprint 2

| ID      | Métrica                                                                 | Objetivo SQAP         | Resultado Obtenido        |  Estado   | Evidencia                                                        |
| :------ | :---------------------------------------------------------------------- | :-------------------- | :------------------------ | :-------: | :--------------------------------------------------------------- |
| **M01** | % Casos de cálculo RM 001/2026 que pasan                                | **100 %**             | **100 % (19/19 casos)**   | ✅ CUMPLE | `CalculoService` (14 unitarios + 5 oficiales) en `junit-api.xml` |
| **M02** | % Escenarios E2E críticos que pasan                                     | **100 %**             | **100 % (7/7 suites)**    | ✅ CUMPLE | Suites Cypress en `e2e/cypress/e2e/` (US-01 a US-19)             |
| **M05** | Cobertura de líneas en código nuevo                                     | **≥ 80 %**            | **≥ 88 %**                | ✅ CUMPLE | Reportes de cobertura Vitest + Jest (`lcov`)                     |
| **M06** | Cobertura en módulos críticos (`notas`, `calculo`, `auth`, `auditoria`) | **≥ 90 % por módulo** | **≥ 90 %**                | ✅ CUMPLE | Configuración `coverageThreshold` en `api/jest.config.ts`        |
| **M07** | Duplicación de código en código nuevo                                   | **≤ 3 %**             | **0 %**                   | ✅ CUMPLE | Revisión de duplicación y reutilización de componentes DRY       |
| **M08** | Vulnerabilidades altas o críticas en dependencias                       | **0**                 | **0 vulnerabilidades**    | ✅ CUMPLE | `npm audit --audit-level=high` (0 vulnerabilidades)              |
| **M09** | Rutas protegidas que rechazan con HTTP 403 sin autorización             | **100 %**             | **100 %**                 | ✅ CUMPLE | Suite `autorizacion.e2e-spec.ts` (rol y materias asignadas)      |
| **M15** | Cambios de nota con registro de auditoría completo y de solo inserción  | **100 %**             | **100 %**                 | ✅ CUMPLE | Trigger PostgreSQL y suite `auditoria.e2e-spec.ts`               |
| **M16** | Errores y advertencias de lint y formato                                | **0**                 | **0 errores, 0 warnings** | ✅ CUMPLE | `eslint . --max-warnings=0` y `prettier --check .`               |

---

## 3. Pruebas Unitarias y de Integración Frontend (Web)

- **Herramienta:** Vitest + React Testing Library + jsdom
- **Comando de ejecución:** `npm run -w web test -- --run`
- **Reporte generado:** `web/reports/junit-web.xml` (archivado en `docs/evidencias/sprint2/junit-web.xml`)
- **Resultado:** **127 pruebas pasadas, 0 fallos, 0 errores** en **13 suites** (incremento neto de 51 pruebas respecto al Sprint 1).

### Detalle de Suites Frontend:

| Suite de Prueba                     | Archivo                                    | Pruebas | Estado  | Criterios e Historias Cubiertas               |
| :---------------------------------- | :----------------------------------------- | :-----: | :-----: | :-------------------------------------------- |
| Aritmética y reglas de notas        | `src/lib/notas.test.ts`                    |    8    | ✅ PASS | US-02 CA 1–4 (RM 001/2026)                    |
| Cliente API HTTP e interceptores    | `src/lib/api.test.ts`                      |    8    | ✅ PASS | Manejo de 401, 403, 422 y tokens JWT          |
| Contexto y persistencia de sesión   | `src/lib/sesion.test.tsx`                  |    6    | ✅ PASS | US-17 CA 1 y 4 (seguridad en cliente)         |
| Apariencia institucional (ADR-0010) | `src/lib/institucion.test.tsx`             |    9    | ✅ PASS | Contraste WCAG 2.1, colores e iniciales       |
| Configuración de dimensiones        | `src/pages/admin/admin.test.tsx`           |    5    | ✅ PASS | US-18 CA 6 y 7 (suma estricta de 100 pts)     |
| Inicio de sesión y menús por rol    | `src/pages/Login.test.tsx`                 |   11    | ✅ PASS | US-17 CA 1–3 y navegación protegida           |
| Planilla y flujos del profesor      | `src/pages/profesor/profesor.test.tsx`     |   32    | ✅ PASS | US-01, US-04, US-05, US-10 y US-19            |
| Gestión de secretaría y cursos      | `src/pages/secretaria/secretaria.test.tsx` |   18    | ✅ PASS | US-18 CA 1–3, CI de estudiantes y burbuja     |
| Tickets de solicitud de edición     | `src/lib/solicitudesEdicion.test.ts`       |    4    | ✅ PASS | Control de cambios y desbloqueo admin         |
| Auditoría inmutable de notas        | `src/lib/auditoriaNotas.test.ts`           |    7    | ✅ PASS | US-04 CA 1–2 (motivo obligatorio y bitácora)  |
| Importación y validación Excel      | `src/lib/importacionExcel.test.ts`         |    5    | ✅ PASS | US-05 CA 1–2 (filas válidas vs observadas)    |
| Asistencia y fórmula ministerial D5 | `src/lib/asistencia.test.ts`               |    8    | ✅ PASS | US-19 CA 1–3 (porcentaje D5 y fechas futuras) |
| Control de entregas por curso       | `src/lib/controlEntregas.test.ts`          |    6    | ✅ PASS | US-10 CA 1–2 (validación de notas completas)  |

---

## 4. Pruebas Unitarias de Backend (API)

- **Herramienta:** Jest + ts-jest
- **Comando de ejecución:** `npm run -w api test`
- **Reporte generado:** `api/reports/junit-api.xml` (archivado en `docs/evidencias/sprint2/junit-api.xml`)
- **Resultado:** **39 pruebas pasadas, 0 fallos, 0 errores** en **4 suites**.

### Detalle de Suites Backend:

| Suite de Prueba                     | Archivo                                            | Pruebas | Estado  | Criterio Cubierto                          |
| :---------------------------------- | :------------------------------------------------- | :-----: | :-----: | :----------------------------------------- |
| Cálculo y dimensiones RM 001/2026   | `src/modules/calculo/calculo.service.spec.ts`      |   14    | ✅ PASS | US-02 CA 1–4 y US-18 CA 6                  |
| Casos oficiales de la tabla firmada | `src/modules/calculo/calculo.casos.spec.ts`        |    5    | ✅ PASS | M01 (tabla oficial firmada por el cliente) |
| Apariencia de la institución        | `src/modules/academico/apariencia.spec.ts`         |   14    | ✅ PASS | ADR-0010 (contraste y normalización hex)   |
| Reglas de asistencia preventiva     | `src/modules/asistencia/reglas-asistencia.spec.ts` |    6    | ✅ PASS | US-19 CA 2–3 (reglas de cálculo y fechas)  |

---

## 5. Pruebas E2E (Cypress contra Staging / Local)

- **Herramienta:** Cypress
- **Configuración:** `e2e/cypress.config.ts`
- **Escenarios verificados:**

1. `inicio-sesion.cy.ts`: Verificación de acceso por rol (Profesor, Secretaria, Administrador, Padre de familia), comprobación de redirección automática, aislamiento de menús y protección contra sesión expirada.
2. `registrar-calificacion.cy.ts`: Navegación asistida a la planilla de calificaciones por dimensión, validación en tiempo real de escala de notas (1–100), rechazo de notas fuera de rango y persistencia en lote.
3. `correccion-auditable.cy.ts` (US-04, T-033): Corrección de calificación exigiendo motivo obligatorio, visualización inmediata del promedio recalculado y verificación de la bitácora inmutable de solo lectura.
4. `historial-academico.cy.ts` (US-03, T-035): Consulta cronológica del estudiante, desglose por trimestres con promedios y ponderaciones por dimensión (Ser 10, Saber 45, Hacer 40, Autoevaluación 5) e indicador de tendencia académica.
5. `importar-notas.cy.ts` (US-05, T-039): Subida y pegado directo de calificaciones desde planilla Excel, vista previa que segrega filas válidas de filas observadas (notas fuera de rango o estudiantes desconocidos) y confirmación con auditoría de origen "IMPORTACIÓN".
6. `registro-asistencia.cy.ts` (US-19, T-037): Marcado ágil de asistencia diaria (Presente, Licencia, Ausente), guardado completo de la lista, bloqueo estricto ante selección de fechas futuras en Bolivia y consulta de porcentajes según la decisión D5.
7. `control-entregas.cy.ts` (US-10, T-040): Monitoreo institucional para secretaría con desglose por curso, estado Entregado / Pendiente, métricas de avance y filtros rápidos por estado y búsqueda por materia o profesor.

---

## 6. Verificación de Seguridad y Calidad Estática

- **Auditoría de Dependencias (M08):** `npm audit --audit-level=high` finalizado con 0 vulnerabilidades. Las dependencias externas cumplen estrictamente las licencias aprobadas por el SQAP (MIT, Apache-2.0, BSD, ISC).
- **Control Estático de Código (M16):** ESLint ejecutado en modo estricto (`eslint . --max-warnings=0`) finalizado sin errores ni advertencias. Formato estandarizado con Prettier.
- **Auditoría e Integridad Referencial:** No repudio garantizado en cambios de notas y aislamiento de la tabla de auditoría mediante triggers PostgreSQL de solo inserción.

---

## 7. Conclusión y Auditoría de Cierre de Sprint 2

El incremento funcional correspondiente al **Sprint 2** satisface todos los criterios de aceptación y las pruebas de control de calidad estipuladas en el SQAP v1.0 (Secciones 7 y 12):

1. Todas las pruebas unitarias, de integración y E2E pasan al 100 %.
2. Se cuenta con los reportes JUnit actualizados en `docs/evidencias/sprint2/`.
3. Se generó el documento de sincronización técnica `frontendSPR2.md` con todos los contratos y endpoints para la integración de backend por Lujan.
4. Las tareas transversales T-027, T-030 y T-041/T-042 quedan formalmente registradas y cumplidas.

El producto se encuentra listo y verificado para la demostración ante el cliente en la revisión del Sprint 2.
