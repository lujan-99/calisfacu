# Informe de Pruebas y Evidencias — Sprint 1

> Elaborado según el SQAP v1.0 (Secciones 7 y 12, Tabla 8).  
> **Responsable:** Galvan (Tester / Responsable SQA)  
> **Auditor:** Lujan (Líder / Arquitecto)  
> **Fecha:** 19/10/2026  
> **Commit evaluado:** `316a430` (`develop`)

---

## 1. Resumen Ejecutivo

Durante el Sprint 1 se implementaron y verificaron las historias del alcance:

- **US-17:** Autenticación y roles (Profesor, Secretaría, Administrador, Padre de familia).
- **US-18:** Gestión académica base (Cursos, materias, asignaciones, dimensiones de evaluación).
- **US-01:** Registro central de calificaciones por dimensiones (Ser, Saber, Hacer, Autoevaluación).
- **US-02:** Cálculo automático de promedios según la RM 001/2026.

Se alcanzó un **100 % de éxito** en todas las suites de pruebas automatizadas ejecutadas tanto en Frontend como en Backend, cumpliendo con los umbrales de calidad del SQAP (M01, M02, M06, M16).

---

## 2. Estado de Métricas de Calidad del Sprint 1

| ID      | Métrica                                                    | Objetivo SQAP         | Resultado Obtenido        | Estado    | Evidencia                                                             |
| ------- | ---------------------------------------------------------- | --------------------- | ------------------------- | --------- | --------------------------------------------------------------------- |
| **M01** | % Casos de cálculo RM 001/2026 que pasan                   | **100 %**             | **100 % (14/14 casos)**   | ✅ CUMPLE | `CalculoService` en `api/reports/junit-api.xml`                       |
| **M02** | % Escenarios E2E críticos que pasan                        | **100 %**             | **100 %**                 | ✅ CUMPLE | Suites Cypress `inicio-sesion.cy.ts` y `registrar-calificacion.cy.ts` |
| **M05** | Cobertura de líneas en código nuevo                        | **≥ 80 %**            | **≥ 85 %**                | ✅ CUMPLE | Reportes lcov / Jest & Vitest coverage                                |
| **M06** | Cobertura en módulos críticos (`notas`, `calculo`, `auth`) | **≥ 90 % por módulo** | **≥ 90 %**                | ✅ CUMPLE | `api/jest.config.ts` (`coverageThreshold`)                            |
| **M09** | Rutas protegidas que rechazan con HTTP 403                 | **100 %**             | **100 %**                 | ✅ CUMPLE | Suite `autorizacion.e2e-spec.ts`                                      |
| **M15** | Cambios de nota con registro de auditoría completo         | **100 %**             | **100 %**                 | ✅ CUMPLE | Suite `auditoria.e2e-spec.ts`                                         |
| **M16** | Errores y advertencias de lint y formato                   | **0**                 | **0 errores, 0 warnings** | ✅ CUMPLE | `npx eslint . --max-warnings=0`                                       |

---

## 3. Pruebas Unitarias y de Integración Frontend (Web)

- **Herramienta:** Vitest + React Testing Library + jsdom
- **Comando de ejecución:** `npm run -w web test -- --run`
- **Reporte generado:** `web/reports/junit-web.xml`
- **Resultado:** **76 pruebas pasadas, 0 fallos, 0 errores** en 8 suites.

### Detalle de Suites Frontend:

| Suite de Prueba                | Archivo                                    | Pruebas | Estado  | Criterio Cubierto                |
| ------------------------------ | ------------------------------------------ | :-----: | :-----: | -------------------------------- |
| Aritmética y reglas de notas   | `src/lib/notas.test.ts`                    |    8    | ✅ PASS | US-02 CA 1-4                     |
| Cliente API HTTP               | `src/lib/api.test.ts`                      |    8    | ✅ PASS | Interceptor de tokens y errores  |
| Contexto de sesión             | `src/lib/sesion.test.tsx`                  |    6    | ✅ PASS | US-17 CA 1 y 4                   |
| Apariencia institucional       | `src/lib/institucion.test.tsx`             |    9    | ✅ PASS | ADR-0010 (colores y logotipo)    |
| Configuración de dimensiones   | `src/pages/admin/admin.test.tsx`           |    4    | ✅ PASS | US-18 CA 6 y 7                   |
| Inicio de sesión y menús       | `src/pages/Login.test.tsx`                 |   11    | ✅ PASS | US-17 CA 1, 2 y 3 (T-012)        |
| Planilla de notas del profesor | `src/pages/profesor/profesor.test.tsx`     |   16    | ✅ PASS | US-01 CA 1, 2 y 3 (T-020, T-024) |
| Gestión de secretaría          | `src/pages/secretaria/secretaria.test.tsx` |   14    | ✅ PASS | US-18 CA 1, 2 y 3 (T-016, T-017) |

---

## 4. Pruebas Unitarias de Backend (API)

- **Herramienta:** Jest + ts-jest
- **Comando de ejecución:** `npm run -w api test`
- **Reporte generado:** `api/reports/junit-api.xml`
- **Resultado:** **39 pruebas pasadas, 0 fallos, 0 errores** en 4 suites.

### Detalle de Suites Backend:

| Suite de Prueba                     | Archivo                                            | Pruebas | Estado  | Criterio Cubierto                |
| ----------------------------------- | -------------------------------------------------- | :-----: | :-----: | -------------------------------- |
| Cálculo y dimensiones RM 001/2026   | `src/modules/calculo/calculo.service.spec.ts`      |   14    | ✅ PASS | US-02 CA 1, 2, 3, 4 y US-18 CA 6 |
| Casos oficiales de la tabla firmada | `src/modules/calculo/calculo.casos.spec.ts`        |    5    | ✅ PASS | M01 (tabla firmada del cliente)  |
| Apariencia de la institución        | `src/modules/academico/apariencia.spec.ts`         |   14    | ✅ PASS | ADR-0010 (contraste WCAG 2.1)    |
| Reglas de asistencia                | `src/modules/asistencia/reglas-asistencia.spec.ts` |    6    | ✅ PASS | US-19 (avance preventivo)        |

---

## 5. Pruebas E2E (Cypress contra Staging)

- **Herramienta:** Cypress
- **Ambiente:** Staging en Render (`calisfacu-web-staging.onrender.com` / `calisfacu-api-staging.onrender.com`)
- **Escenarios verificados:**
  1. `inicio-sesion.cy.ts`: Ingreso de profesor, secretaria, administrador y padre de familia; comprobación de redirección a su panel respectivo y protección contra 5 intentos fallidos (bloqueo de cuenta).
  2. `registrar-calificacion.cy.ts`: Navegación a la materia asignada, apertura de la planilla de calificaciones, ingreso de notas por dimensión, rechazo de notas fuera de rango (> 100 o < 1), cálculo del promedio en vivo y persistencia de notas.

---

## 6. Conclusión de Calidad del Sprint 1

Todas las evidencias requeridas por la Sección 12 del SQAP han sido verificadas en el commit `316a430`. El incremento funcional está listo para la auditoría de cierre de pruebas (T-026) y la demostración ante el cliente en la reunión de revisión del Sprint 1.
