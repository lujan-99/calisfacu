# Acta de auditoría de cierre del Sprint 3: evidencias de prueba (T-056)

> SQAP, Tabla 14. Lujan (auditor) revisa las evidencias de prueba que Galvan (auditado) produjo para el Sprint 3. La
> auditoría inversa, de los artefactos de desarrollo, es T-055.

- **Fecha:** 29 y 30/10/2026
- **Alcance:** lo que Galvan entregó para el Sprint 3 hasta el commit `f8f1e84` (25/10/2026): pantallas y pruebas de la
  web (T-044, T-047, T-049, T-051), escenarios Cypress, informe `informe-pruebas-sprint3.md`, capturas y
  `junit-web.xml` de `docs/evidencias/sprint3/`; además, el estado de las tareas de calidad T-052 a T-054.
- **Auditor:** Lujan · **Auditado:** Galvan
- **Método:** se ejecutaron las suites en local: API (Jest con PostgreSQL), web (Vitest), Cypress contra la API y la
  web locales (base `calis_e2e` con el seed) y JMeter contra la API local (base `calis_perf` con `seed:perf`).

## 1. Indicadores (SQAP, Tabla 14)

| N.º | Indicador                        | Se cumple si…                                                            | Cumple         | Evidencia                                                                                                                                                              |
| --- | -------------------------------- | ------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pruebas ejecutadas               | Más de cero y las mismas que corren en local                             | Sí             | Las 178 pruebas de la web del informe corren en local                                                                                                                  |
| 2   | Pruebas fallidas                 | 0 fallos y JUnit publicados                                              | Parcial        | Web en verde con su JUnit; no se archivó el JUnit de la API ni el de Cypress                                                                                           |
| 3   | Escenarios E2E (M02)             | Cypress ejecutó todos sus escenarios y pasaron                           | No             | Contra la aplicación real fallaban 5 escenarios (4 del Sprint 3 y el menú de la secretaria). La "evidencia 5" es `npx cypress verify`, que no ejecuta ningún escenario |
| 4   | Reglas de cálculo (M01)          | 100 % de los casos de la tabla                                           | Sí             | `calculo.casos.spec.ts` en verde                                                                                                                                       |
| 5   | Cobertura código nuevo (M05)     | ≥ 80 % en código nuevo                                                   | No verificable | El informe declara 83,51 %, que es la cobertura total de la web; sin SonarQube Cloud no se mide el código nuevo (T-030)                                                |
| 6   | Cobertura módulos críticos (M06) | ≥ 90 % por módulo                                                        | Sí             | `coverageThreshold` de Jest. El informe llama "críticos" a `riesgo`, `boletin`, `vinculos` y `boletinPadre`, que no lo son (SQAP, Tabla 4)                             |
| 7   | Lint y formato (M16)             | 0 errores y 0 advertencias                                               | Sí             | ESLint y Prettier sin observaciones; la web compila (`tsc -b && vite build`)                                                                                           |
| 8   | Dependencias (M08)               | 0 altas o críticas                                                       | No             | `npm audit --audit-level=high` informa altas en `body-parser`, `multer` y `systeminformation` (dependencias anteriores al sprint); el informe declara 0                |
| 9   | Trazabilidad de aceptación       | Cada criterio tiene una prueba "debe…" que prueba el comportamiento real | No             | Las pantallas suplían la API que faltaba con datos armados en el navegador; las pruebas validaban esas simulaciones (ver hallazgos 3 y 4)                              |
| 10  | Rendimiento (M03, M04)           | Planes de JMeter que miden la operación y resultados del RC              | No             | T-052 sin hacer: `planilla.jmx` respondía 422 en el 99 % de las peticiones (corrige notas sin solicitud aprobada, D16), así que M04 no se podía medir                  |
| 11  | Evidencias archivadas            | Evidencias en su carpeta, fieles a la ejecución                          | No             | El informe declaraba las cuatro historias "Superada", M02 en 30 de 30 y M09 al 100 % cuando el backend de las cuatro historias no existía                              |

## 2. Hallazgos

| N.º | Indicador | Descripción                                                                                                                                                                                                                                                     | Severidad | Estado                                 |
| --- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------- |
| 1   | 3         | `panel-riesgo.cy.ts` y `boletin-pdf.cy.ts` buscaban elementos que no existen (`tab-filtro-riesgo`, `tabla-boletines-curso`, un `h1` con otro texto): 4 de 8 escenarios fallaban                                                                                 | Mayor     | Corregido en `ce1c8ba`                 |
| 2   | 3         | `inicio-sesion.cy.ts` no se actualizó al agregar "Vínculos familiares" al menú (`b17cd71`) y fallaba                                                                                                                                                            | Mayor     | Corregido en `ce1c8ba`                 |
| 3   | 9         | "Generar boletines" leía `/api/estudiantes`, que solo usa la secretaria: con la API real el profesor recibía siempre 403                                                                                                                                        | Crítica   | Corregido en `80f55e0`                 |
| 4   | 9         | Datos simulados que ocultaban errores: panel de riesgo armado en el navegador con umbral fijo, cola de boletines que se daba por "COMPLETADO" si la API fallaba, `catch` que convertían errores en listas vacías, PDF del padre que caía a la ruta del profesor | Mayor     | Corregido en `80f55e0`                 |
| 5   | 10        | `planilla.jmx` medía correcciones que desde D16 se rechazan con 422; M04 no era medible desde el Sprint 2                                                                                                                                                       | Mayor     | Corregido el 30/10/2026 (plan rehecho) |
| 6   | 11        | Informe del Sprint 3 sin relación con lo que el sistema hacía (historias "Superada", M02, M08 y M09 cumplidos)                                                                                                                                                  | Mayor     | Rehecho el 30/10/2026                  |
| 7   | 2         | Sin JUnit de la API ni de Cypress archivados                                                                                                                                                                                                                    | Menor     | Archivados el 30/10/2026               |
| 8   | 5, 6      | M05 presentado con la cobertura total de la web y M06 aplicado a módulos que no son críticos                                                                                                                                                                    | Menor     | Aclarado en el informe rehecho         |
| 9   | 8         | Vulnerabilidades altas de `npm audit` en dependencias anteriores al sprint                                                                                                                                                                                      | Mayor     | Abierto                                |
| 10  | —         | T-053 (RC1 en staging) y T-054 (prueba de usabilidad) sin realizar ni mencionar en el informe                                                                                                                                                                   | Menor     | Abiertos: T-054 queda preparada        |

## 3. Decisión

- [ ] Sin hallazgos (aprobado)
- [ ] Con hallazgos menores (se corrigen en el Sprint 4)
- [x] **Con hallazgos mayores (bloquean el cierre)**: los hallazgos 1 a 8 se corrigieron el 29 y 30/10/2026. Siguen
      abiertos el 9 (vulnerabilidades altas, bloquea M08) y el 10.

**Limitación de independencia:** Lujan escribió las correcciones de los hallazgos 1 a 8, así que esta auditoría no
puede darlas por verificadas: las revisa Galvan en T-055.

## 4. Firmas

| Nombre | Rol en la auditoría | Firma |
| ------ | ------------------- | ----- |
| Lujan  | Auditor             |       |
| Galvan | Auditado            |       |
