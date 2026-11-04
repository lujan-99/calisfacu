# Acta de auditoría de las evidencias de prueba del Sprint 4 (T-068)

> SQAP, Tabla 14. Lujan (auditor) revisa las evidencias de prueba que Galvan (auditado) entregó para el Sprint 4. La
> auditoría del SQAP contra sus 7 indicadores es T-067 (Galvan).

- **Fecha:** 03 y 04/11/2026
- **Alcance:** lo que Galvan entregó el 02/11/2026 hasta `8b24a26`: pantallas y pruebas de la web de US-09, US-08 y
  US-12 (T-059, T-061 y T-062 en su parte web), `informe-pruebas-sprint4.md`, `informe-cumplimiento-sprint4.md`,
  `junit-web.xml`, `junit-api.xml` y las capturas de `docs/evidencias/sprint4/capturas/`.
- **Auditor:** Lujan · **Auditado:** Galvan
- **Método:** se ejecutó la suite de la web en ese commit (worktree aparte), se revisó el código de las pantallas y se
  ejecutaron Cypress contra la API y la web locales (base `calis_e2e`) y el pipeline de Jenkins.

## 1. Indicadores (SQAP, Tabla 14)

| N.º | Indicador                        | Se cumple si…                                                            | Cumple         | Evidencia                                                                                                                                     |
| --- | -------------------------------- | ------------------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pruebas ejecutadas               | Más de cero y las mismas que corren en local                             | Sí             | En `8b24a26` corren las 222 pruebas de la web que declara el informe (19 archivos)                                                            |
| 2   | Pruebas fallidas                 | 0 fallos y JUnit publicados                                              | Sí             | Web y API unitarias en verde, con sus JUnit                                                                                                   |
| 3   | Escenarios E2E (M02)             | Cypress ejecutó todos sus escenarios y pasaron                           | No             | El informe llama M02 a las 222 pruebas de Vitest. No hay escenarios Cypress del Sprint 4 y `inicio-sesion.cy.ts` falla desde `2e8ab99`        |
| 4   | Reglas de cálculo (M01)          | 100 % de los casos de la tabla                                           | Sí             | `calculo.casos.spec.ts`, 13 casos en verde                                                                                                    |
| 5   | Cobertura código nuevo (M05)     | ≥ 80 % en código nuevo                                                   | No verificable | El informe declara «100 % de funciones y módulos nuevos» sin el dato de SonarQube Cloud                                                       |
| 6   | Cobertura módulos críticos (M06) | ≥ 90 % por módulo                                                        | Sí             | Lo cumplen los módulos críticos de la API. El informe vuelve a llamar críticos a archivos de la web (igual que el hallazgo 8 del Sprint 3)    |
| 7   | Lint y formato (M16)             | 0 errores y 0 advertencias                                               | Sí             | ESLint y Prettier sin observaciones; la web compila                                                                                           |
| 8   | Dependencias (M08)               | 0 altas o críticas                                                       | Sí             | `npm audit --audit-level=high` sale con 0                                                                                                     |
| 9   | Trazabilidad de aceptación       | Cada criterio tiene una prueba "debe…" que prueba el comportamiento real | No             | Los nueve criterios figuran «Cumplido» con pruebas de funciones del navegador que simulaban la API inexistente (hallazgo 1)                   |
| 10  | Rendimiento (M03, M04)           | Planes de JMeter que miden la operación y resultados del RC              | No aplica      | El Sprint 4 se mide en la RC2 (T-063)                                                                                                         |
| 11  | Evidencias archivadas            | Evidencias en su carpeta, fieles a la ejecución                          | No             | Las capturas son fieles a lo ejecutado, pero el informe de cumplimiento da por cumplidos criterios que no se podían cumplir (hallazgos 1 a 4) |

## 2. Hallazgos

| N.º | Indicador | Descripción                                                                                                                                                                                                                                                                                                                                                              | Severidad | Estado                                                  |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------- |
| 1   | 9, 11     | Las pantallas del centralizador, de las alertas y de los avisos al padre tenían 11 bloques `catch` que, si la API fallaba (y la API de esas pantallas no existía), armaban los datos en el navegador: notas `60 + ((id × 7 + materia × 13) mod 36)`, alertas con «correo enviado hace 3 minutos» y avisos con «entregado en 8 minutos». Las pruebas validaban esos datos | Crítica   | Corregido en `a828cb0` y `0eb3204`                      |
| 2   | 11        | `informe-cumplimiento-sprint4.md` declara cumplidos US-09, US-08 y US-12 y, en la misma tabla, deja T-057, T-058 y T-060 «esperando backend»; US-12 CA 1 («correo en 15 minutos») no tenía envío de correo                                                                                                                                                               | Mayor     | Informe actualizado el 04/11/2026                       |
| 3   | 3         | M02 presentado con pruebas unitarias de la web; `inicio-sesion.cy.ts` en rojo por los menús nuevos                                                                                                                                                                                                                                                                       | Mayor     | Corregido en `a828cb0`; `centralizacion.cy.ts` agregado |
| 4   | 5, 6      | M05, M06, M07, M09 y M10 declarados como cumplidos sin medición (sin SonarQube, sin rutas nuevas en la API, sin Lighthouse)                                                                                                                                                                                                                                              | Menor     | Aclarado en el informe actualizado                      |
| 5   | —         | El informe de cumplimiento enlaza archivos de la computadora del autor (`file:///c:/Users/...`), que no existen en el repositorio                                                                                                                                                                                                                                        | Menor     | Enlaces quitados en el informe actualizado              |
| 6   | —         | La pantalla de avisos del padre mostraba fijo «≤ 15 min, entrega garantizada» y la del boletín decía que el correo «se emitió en menos de 15 minutos», sin dato que lo respalde                                                                                                                                                                                          | Mayor     | Corregido en `0eb3204` y `0350219`                      |

Lo que sí estaba bien: las pantallas tienen buen diseño y accesibilidad (diálogos con rol, etiquetas), las funciones de
filtrado y resumen están probadas, y las capturas reflejan lo que se ejecutó.

## 3. Decisión

- [ ] Sin hallazgos (aprobado)
- [ ] Con hallazgos menores (se corrigen en el Sprint 4)
- [x] **Con hallazgos mayores (bloquean el cierre)**: todos se corrigieron el 03 y 04/11/2026 (backend de T-057, T-058,
      T-060, T-061 y T-062, pantallas contra la API real y pruebas que verifican el comportamiento real).

**Limitación de independencia:** Lujan escribió las correcciones, así que esta auditoría no puede darlas por
verificadas: las revisa Galvan en T-067 o en la revisión de los commits citados.

## 4. Estado final de las evidencias de prueba del proyecto (04/11/2026)

| Evidencia                                | Dónde                                                     | Estado                                                                |
| ---------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| API: unitarias + e2e con PostgreSQL real | Jenkins, etapa API · `informe-backend-sprint4.md`         | 343 pruebas en verde; cobertura 97,8 % de líneas; críticos ≥ 96,9 %   |
| Web                                      | Jenkins, etapa Web                                        | 217 pruebas en verde                                                  |
| Cypress (M02)                            | Jenkins, etapa E2E contra staging · `t07-cypress-aislado` | 13 archivos, 33 escenarios en verde                                   |
| Seguridad (OWASP)                        | `revision-owasp-sprint3.md`, `informe-backend-sprint4.md` | H1 a H4 corregidos; CAL-003 verificado en staging con `TRUST_PROXY=2` |
| Rendimiento (M03, M04)                   | `docs/evidencias/v1.0.0-rc.1/`, RC2                       | RC1 en verde; RC2 en T-063                                            |
| Respaldos (M14)                          | GitHub Actions `backup`                                   | Restauración verificada el 30/10/2026                                 |
| Usabilidad (M11, M12)                    | `docs/evidencias/usabilidad/`                             | **Pendiente:** T-054 necesita 5 profesores reales                     |
| Aceptación del cliente                   | `docs/actas/`                                             | **Pendiente:** demos de los sprints y T-064                           |

## 5. Firmas

| Nombre | Rol en la auditoría | Firma |
| ------ | ------------------- | ----- |
| Lujan  | Auditor             |       |
| Galvan | Auditado            |       |
