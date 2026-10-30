# Informe de pruebas — Sprint 3

> SQAP, Secciones 7 y 12 (Tabla 8). Rehecho el 30/10/2026 por Lujan con resultados ejecutados el 29 y 30/10/2026.
> Reemplaza la versión del 25/10/2026, que daba las cuatro historias por superadas cuando su backend todavía no
> existía (ver la sección 7 y el acta T-056). **Actualizado el 30/10/2026** con los resultados oficiales de Jenkins,
> staging, la RC1 y SonarQube Cloud; las capturas están en `informe-cumplimiento-sprint3.pdf`.

- **Rama:** `develop`; builds #36 a #40 de Jenkins en verde (deploy, smoke test y E2E contra staging); etiqueta
  `v1.0.0-rc.1` sobre `c1ff200` con la etapa Rendimiento en verde
- **Ambientes:** local (PostgreSQL 16 y Redis 7 de `docker-compose.yml`), Jenkins (agente con PostgreSQL y Redis; JMeter
  de la RC1) y staging en Render (API, web, PostgreSQL y Redis para la cola de boletines).
- **Evidencias archivadas en esta carpeta:** `junit-api.xml`, `junit-web.xml`, `junit-e2e.xml` y `jmeter-*.json`
  (corrida local), `capturas/`, `zap/` e `informe-cumplimiento-sprint3.pdf`; las estadísticas de JMeter de la RC1 en
  `docs/evidencias/v1.0.0-rc.1/`.

## 1. Alcance

| Historia                           | Qué se probó                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| US-06 Panel de riesgo académico    | Nota del trimestre y asistencia acumulada por estudiante (D18); en riesgo según D6 con el umbral de la gestión, que cambia el administrador    |
| US-07 Boletín de notas en PDF      | Encabezado con UE, SIE, nivel, año y paralelo; mismas notas y asistencia que el historial (D19); cola BullMQ de 51 estudiantes con aviso y PDF |
| US-20 Vinculación padre–estudiante | Vínculos con parentesco (D17); el padre ve solo a sus hijos; 403 con un estudiante no vinculado o inexistente                                  |
| US-11 Consulta de boletín          | Publicación por curso y trimestre solo con todas las entregas (D20); sin publicar, el padre no ve notas; publicado, lo ve y lo descarga        |

## 2. Métricas

| ID  | Métrica                                                  | Umbral     | Resultado                                                                                                           | Cumple    |
| --- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- | --------- |
| M01 | Casos de cálculo de la tabla firmada que pasan           | 100 %      | 13 de 13 (`calculo.casos.spec.ts`; la tabla pasó de 5 a 13 casos frontera de D1 y D2)                               | Sí        |
| M02 | Escenarios E2E críticos que pasan                        | 100 %      | 31 de 31 contra staging (30/10/2026) y etapa E2E de Jenkins en verde en los builds #36 a #40                        | Sí        |
| M03 | p95 de "generar boletín de un estudiante"                | ≤ 2000 ms  | 39 ms en Jenkins, RC1 (55.919 peticiones, media 19 ms); 29 ms en local                                              | Sí        |
| M04 | Error bajo carga de "registrar planilla" y "boletín"     | < 1 %      | 0 % en Jenkins, RC1 (55.919 boletines y 53.028 planillas); 0 % en local                                             | Sí        |
| M05 | Cobertura de líneas del código nuevo                     | ≥ 80 %     | SonarQube Cloud: 100 % del código nuevo, 88,1 % del total; Quality Gate "Sonar way" en verde                        | Sí        |
| M06 | Cobertura de líneas por módulo crítico                   | ≥ 90 %     | notas, calculo, auditoria y familias 100 %; auth 98,6 % (`coverageThreshold` de Jest)                               | Sí        |
| M07 | Duplicación en código nuevo                              | ≤ 3 %      | SonarQube Cloud: 0,0 % del código nuevo, 0,8 % del total                                                            | Sí        |
| M08 | Vulnerabilidades altas o críticas                        | 0          | 0 altas ni críticas (8 bajas, 6 moderadas) tras los `overrides`; SonarQube Cloud: seguridad A; OWASP ZAP sin fallas | Sí        |
| M09 | Rutas protegidas que rechazan con 401 y 403              | 100 %      | Las 19 rutas nuevas en `autorizacion.e2e-spec.ts`; comprobado también en staging (revisión OWASP)                   | Sí        |
| M11 | Profesores que registran notas sin ayuda                 | ≥ 80 %     | No medida: la prueba con 5 profesores está preparada (T-054)                                                        | No medida |
| M12 | Puntaje SUS promedio                                     | ≥ 68       | No medida (T-054)                                                                                                   | No medida |
| M13 | Disponibilidad mensual                                   | ≥ 99,0 %   | UptimeRobot sobre staging desde el 30/10/2026: 100 %; producción aún no existe                                      | Parcial   |
| M14 | RPO y RTO de la base                                     | 24 h y 2 h | Respaldo diario cifrado (GitHub Actions); restauración probada: 19 tablas, RTO 1 s                                  | Sí        |
| M15 | Cambios de nota con auditoría completa de solo inserción | 100 %      | Sin cambios en el sprint; la carga de planillas dejó una fila de auditoría por nota                                 | Sí        |
| M16 | Errores y advertencias de lint y formato                 | 0          | `eslint . --max-warnings=0` y `prettier --check .` sin observaciones                                                | Sí        |

## 3. API (Jest + Supertest con PostgreSQL y Redis reales)

`npm run -w api test:cov`: **292 pruebas en 24 suites, 0 fallos**; 98,7 % de líneas (279 al cierre del 29/10; se
sumaron 5 de las cabeceras de seguridad y 8 casos de M01).

Suites nuevas del sprint: `familias`, `panel`, `boletin` y `consulta-boletin` (e2e); `riesgo` y `contenido`
(unitarias, criterio 2 de US-06 y criterio 1 de US-07). `autorizacion` ampliada con las rutas nuevas.

## 4. Web (Vitest + Testing Library)

`npm run -w web test -- --run --coverage`: **183 pruebas en 16 archivos, 0 fallos**. Cobertura: 86,1 % de líneas,
81,1 % de ramas. Pruebas nuevas: la cola de boletines hasta el aviso y la descarga del PDF del curso, el error de la API
sin simular que terminó, y la pantalla de publicación de boletines.

## 5. E2E (Cypress)

**31 escenarios en 12 archivos, todos en verde**, contra la API y la web locales con el seed. Del Sprint 3:
`panel-riesgo` (2), `boletin-pdf` (2, incluye la cola completa y la descarga del PDF del curso),
`vinculacion-padres` (2), `consulta-boletin-padre` (2) y `publicacion-boletines` (1).

Observación: en 2 de 7 corridas completas un escenario falló porque `cy.screenshot()` agotó sus 30 s (Electron sin
pantalla), cada vez en un archivo distinto y sin relación con la aplicación; al repetir, pasaron todos. El
`junit-e2e.xml` archivado es la última corrida, 31 de 31. Si se repite en Jenkins, conviene quitar las capturas de los
escenarios (ya se guardan al fallar).

**Contra staging:** la etapa E2E de Jenkins pasó en los builds #36 a #40, y una corrida completa el 30/10/2026 dio
31 de 31 en 3 min 23 s.

## 6. Rendimiento (JMeter 5.6.3)

100 usuarios concurrentes durante 10 minutos por operación, con 1 s de pausa entre peticiones, contra la API compilada
con el seed de rendimiento (40 cursos de 60 estudiantes). Es la misma configuración de la etapa Rendimiento del
`Jenkinsfile`. El resultado oficial es el de Jenkins con la etiqueta `v1.0.0-rc.1` (T-053):

| Operación (Jenkins, RC1)         | Peticiones | Errores | Media | p95    | Umbral                |
| -------------------------------- | ---------- | ------- | ----- | ------ | --------------------- |
| Generar boletín de un estudiante | 55.919     | 0 %     | 19 ms | 39 ms  | p95 ≤ 2000 ms y < 1 % |
| Registrar planilla               | 53.028     | 0 %     | 74 ms | 178 ms | < 1 %                 |

Corrida local, como referencia:

| Operación                           | Peticiones | Errores | Media | p95   | Umbral                |
| ----------------------------------- | ---------- | ------- | ----- | ----- | --------------------- |
| Generar boletín de un estudiante    | 56.001     | 0 %     | 17 ms | 29 ms | p95 ≤ 2000 ms y < 1 % |
| Registrar planilla (60 estudiantes) | 27.439     | 0 %     | 56 ms | 80 ms | < 1 %                 |
| Crear actividad                     | 27.482     | 0 %     | 18 ms | 39 ms | < 1 %                 |

Las 27.439 planillas dejaron 1.646.340 notas, cada una con su fila de auditoría. Estadísticas completas en
`jmeter-boletin.json` y `jmeter-planilla.json`.

`planilla.jmx` se rehízo: corregía notas al azar, lo que desde la decisión D16 exige una solicitud aprobada y respondía
422 en el 99 % de las peticiones. Ahora mide lo que dice M04: cada iteración crea una actividad y registra la nota de
los 60 estudiantes del curso en una transacción con auditoría.

## 7. Defectos encontrados y corregidos durante el sprint

| N.º | Defecto                                                                                                                | Corrección                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | El backend de las cuatro historias no existía; las pantallas lo suplían con datos armados en el navegador              | `91be7b5`, `1800c9a`, `1abc5de`, `f7a637f`            |
| 2   | Crear un vínculo repetido actualizaba el parentesco en vez de rechazarlo (`save` de TypeORM con clave compuesta)       | `91be7b5` (con su prueba)                             |
| 3   | "Generar boletines" leía `/api/estudiantes`, de la secretaria: el profesor recibía 403                                 | `80f55e0`                                             |
| 4   | La cola de boletines se daba por completada si la API fallaba; varios `catch` convertían errores en listas vacías      | `80f55e0`                                             |
| 5   | `panel-riesgo.cy.ts`, `boletin-pdf.cy.ts` e `inicio-sesion.cy.ts` fallaban contra la aplicación real                   | `ce1c8ba`                                             |
| 6   | `planilla.jmx` respondía 422 desde D16: M04 no era medible                                                             | Cierre del sprint                                     |
| 7   | Vulnerabilidades altas en `body-parser`, `multer` (vía `@nestjs/platform-express`) y `systeminformation` (vía Cypress) | Cierre del sprint (`overrides`)                       |
| 8   | Nombres largos de materia se salían de la fila en el PDF                                                               | `1abc5de`                                             |
| 9   | CAL-001 (S1): la API no arrancaba en Render por `bullmq` en `api/node_modules`; staging seguía en la versión del 21/10 | `c1ff200` y prueba de regresión `27535e6`; postmortem |
| 10  | CAL-002 (S2): la prueba de restauración del respaldo fallaba con el rol `postgres` de Render                           | `8fbe4d7`                                             |
| 11  | OWASP H1: la API sin cabeceras de seguridad y con `X-Powered-By`                                                       | `ff7cd22`, `6ba9d85` (helmet, 5 pruebas)              |
| 12  | OWASP H2: la web sin CSP ni protección contra clickjacking                                                             | `9a070b0`, `18c40fb`                                  |

Abiertos para el Sprint 4: CAL-003 (login sin límite por IP) y CAL-004 (mensajes de validación en inglés).

## 8. Pendiente

- **T-054:** prueba de usabilidad con 5 profesores (`docs/evidencias/usabilidad/prueba-usabilidad-sprint3.md`).
- **Revisión del sprint con el cliente:** `docs/actas/revision-sprint3.md`, con las decisiones D17 a D20, y firma del
  acta de conformidad de cálculo (13 casos).
- **T-055:** auditoría de los artefactos de desarrollo, la realiza Galvan; incluye verificar CAL-001 y CAL-002.
- **Firmas** de las actas del sprint, de la revisión OWASP y del postmortem.
