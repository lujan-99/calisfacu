# Informe de pruebas — Sprint 3

> SQAP, Secciones 7 y 12 (Tabla 8). Rehecho el 30/10/2026 por Lujan con resultados ejecutados el 29 y 30/10/2026.
> Reemplaza la versión del 25/10/2026, que daba las cuatro historias por superadas cuando su backend todavía no
> existía (ver la sección 7 y el acta T-056).

- **Rama:** `develop`, commit del cierre del Sprint 3 (este informe) sobre `ce1c8ba`
- **Ambiente:** local. API con PostgreSQL 16 y Redis 7 de `docker-compose.yml`; Cypress contra la API y la web locales
  (base `calis_e2e` con el seed); JMeter contra la API compilada (base `calis_perf` con `seed:perf`).
- **Pendiente en Jenkins y staging:** el build del cierre y la etiqueta `v1.0.0-rc.1` (T-053), que ejecuta la etapa
  Rendimiento. Antes hay que crear en Render el Redis de `render.yaml`.
- **Evidencias archivadas en esta carpeta:** `junit-api.xml`, `junit-web.xml`, `junit-e2e.xml` y `jmeter-*.json`
  (estadísticas de JMeter).

## 1. Alcance

| Historia                           | Qué se probó                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| US-06 Panel de riesgo académico    | Nota del trimestre y asistencia acumulada por estudiante (D18); en riesgo según D6 con el umbral de la gestión, que cambia el administrador    |
| US-07 Boletín de notas en PDF      | Encabezado con UE, SIE, nivel, año y paralelo; mismas notas y asistencia que el historial (D19); cola BullMQ de 51 estudiantes con aviso y PDF |
| US-20 Vinculación padre–estudiante | Vínculos con parentesco (D17); el padre ve solo a sus hijos; 403 con un estudiante no vinculado o inexistente                                  |
| US-11 Consulta de boletín          | Publicación por curso y trimestre solo con todas las entregas (D20); sin publicar, el padre no ve notas; publicado, lo ve y lo descarga        |

## 2. Métricas

| ID  | Métrica                                                  | Umbral    | Resultado                                                                                                    | Cumple     |
| --- | -------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| M01 | Casos de cálculo de la tabla firmada que pasan           | 100 %     | 100 % (`calculo.casos.spec.ts`)                                                                              | Sí         |
| M02 | Escenarios E2E críticos que pasan                        | 100 %     | 31 de 31 en local (12 archivos). Falta la corrida contra staging del RC (T-053)                              | Parcial    |
| M03 | p95 de "generar boletín de un estudiante"                | ≤ 2000 ms | 29 ms (56.001 boletines, media 17 ms) en local; falta el RC en Jenkins (T-053)                               | Sí (local) |
| M04 | Error bajo carga de "registrar planilla" y "boletín"     | < 1 %     | 0 % en las dos operaciones (56.001 boletines; 27.439 planillas y 27.482 actividades) en local                | Sí (local) |
| M05 | Cobertura de líneas del código nuevo                     | ≥ 80 %    | Sin SonarQube Cloud no se mide "código nuevo" (T-030). Total: API 98,8 %, web 86,1 % de líneas               | Parcial    |
| M06 | Cobertura de líneas por módulo crítico                   | ≥ 90 %    | auth, notas, calculo y auditoria sobre el umbral (`coverageThreshold` de Jest)                               | Sí         |
| M07 | Duplicación en código nuevo                              | ≤ 3 %     | No medida: requiere SonarQube Cloud (T-030)                                                                  | No medida  |
| M08 | Vulnerabilidades altas o críticas                        | 0         | 0 altas tras forzar `body-parser` 2.4.0, `multer` 2.5.0 y `systeminformation` 5.33.16 (8 bajas, 7 moderadas) | Sí         |
| M09 | Rutas protegidas que rechazan con 401 y 403              | 100 %     | Las 19 rutas nuevas del sprint están en `autorizacion.e2e-spec.ts`                                           | Sí         |
| M11 | Profesores que registran notas sin ayuda                 | ≥ 80 %    | No medida: la prueba con 5 profesores está preparada (T-054)                                                 | No medida  |
| M12 | Puntaje SUS promedio                                     | ≥ 68      | No medida (T-054)                                                                                            | No medida  |
| M15 | Cambios de nota con auditoría completa de solo inserción | 100 %     | Sin cambios en el sprint; la carga de planillas dejó una fila de auditoría por nota                          | Sí         |
| M16 | Errores y advertencias de lint y formato                 | 0         | `eslint . --max-warnings=0` y `prettier --check .` sin observaciones                                         | Sí         |

## 3. API (Jest + Supertest con PostgreSQL y Redis reales)

`npm run -w api test:cov`: **279 pruebas en 23 suites, 0 fallos**; 98,8 % de líneas.

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

## 6. Rendimiento (JMeter 5.6.3)

100 usuarios concurrentes durante 10 minutos por operación, con 1 s de pausa entre peticiones, contra la API compilada
con el seed de rendimiento (40 cursos de 60 estudiantes). Es la misma configuración de la etapa Rendimiento del
`Jenkinsfile`, pero en local: el resultado oficial del RC se toma en Jenkins (T-053).

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

| N.º | Defecto                                                                                                                | Corrección                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | El backend de las cuatro historias no existía; las pantallas lo suplían con datos armados en el navegador              | `91be7b5`, `1800c9a`, `1abc5de`, `f7a637f` |
| 2   | Crear un vínculo repetido actualizaba el parentesco en vez de rechazarlo (`save` de TypeORM con clave compuesta)       | `91be7b5` (con su prueba)                  |
| 3   | "Generar boletines" leía `/api/estudiantes`, de la secretaria: el profesor recibía 403                                 | `80f55e0`                                  |
| 4   | La cola de boletines se daba por completada si la API fallaba; varios `catch` convertían errores en listas vacías      | `80f55e0`                                  |
| 5   | `panel-riesgo.cy.ts`, `boletin-pdf.cy.ts` e `inicio-sesion.cy.ts` fallaban contra la aplicación real                   | `ce1c8ba`                                  |
| 6   | `planilla.jmx` respondía 422 desde D16: M04 no era medible                                                             | Cierre del sprint                          |
| 7   | Vulnerabilidades altas en `body-parser`, `multer` (vía `@nestjs/platform-express`) y `systeminformation` (vía Cypress) | Cierre del sprint (`overrides`)            |
| 8   | Nombres largos de materia se salían de la fila en el PDF                                                               | `1abc5de`                                  |

## 8. Pendiente

- **T-053:** etiqueta `v1.0.0-rc.1`, build de Jenkins con E2E contra staging y etapa Rendimiento. Antes, crear en
  Render el Redis de `render.yaml` (Blueprint → sincronizar).
- **T-054:** prueba de usabilidad con 5 profesores (`docs/evidencias/usabilidad/prueba-usabilidad-sprint3.md`).
- **T-055:** auditoría de los artefactos de desarrollo, la realiza Galvan.
- **T-030:** SonarQube Cloud (M05 sobre código nuevo y M07).
- **SQAP (.docx), Tabla 24:** dice pdfmake; el boletín usa pdfkit, y bullmq usa ioredis. Se corrige en la próxima
  versión del plan; `matrices-sqap.xlsx` y `matrices-sqap.md` ya están al día.
- **Revisión del sprint con el cliente:** `docs/actas/revision-sprint3.md`, con las decisiones D17 a D20.
