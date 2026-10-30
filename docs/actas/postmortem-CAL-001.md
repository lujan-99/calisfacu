# Postmortem CAL-001: la API de staging no arrancaba en Render

> SQAP, Sección 8: todo defecto S1 produce un postmortem sin culpables, con acciones, responsable y fecha. Issue
> [#72](https://github.com/lujan-99/calisfacu/issues/72).

- **Fecha del análisis:** 30/10/2026 · **Redacta:** Lujan · **Revisa:** Galvan (pendiente)
- **Severidad y prioridad:** S1 · P1
- **Duración:** del 25/10/2026 (primer smoke test en rojo, build #28 de develop) al 30/10/2026 02:11 (build #36 en verde).
  Staging sirvió todo ese tiempo la versión `88e01fa` del 21/10/2026.

## 1. Impacto

- Nada del Sprint 3 llegó a staging: panel de riesgo, boletín en PDF, cola de boletines, vinculación de padres y
  consulta del boletín. La demo con el cliente, la prueba de usabilidad (T-054) y la RC1 (T-053) quedaron bloqueadas.
- Ningún dato se perdió: staging usa datos sintéticos y Render mantuvo la versión anterior en línea, por eso UptimeRobot
  no habría avisado (la salud respondía `ok`, pero con un commit viejo).

## 2. Línea de tiempo

| Fecha y hora (Bolivia) | Hecho                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| 21/10/2026             | Último build verde de develop (#26); staging en `88e01fa`                                             |
| 25/10/2026             | Build #28: el smoke test falla tras 10 minutos (la API desplegada no responde con el commit nuevo)    |
| 29/10/2026             | `1abc5de` agrega BullMQ; los builds #29 a #34 fallan en el smoke test                                 |
| 30/10/2026 01:51       | Build #35 falla además en Análisis estático (SonarQube recién activado, otro motivo)                  |
| 30/10/2026 ~02:00      | El usuario comparte el estado de Render: "Failed deploy"; el log muestra `Cannot find module`         |
| 30/10/2026 02:04       | Se reproduce y corrige en local (`c1ff200`); la imagen arranca con PostgreSQL y Redis                 |
| 30/10/2026 02:11       | Build #36 en verde: deploy, smoke test y E2E contra staging; staging en `c1ff200`                     |
| 30/10/2026             | `27535e6`: la imagen comprueba al construirse que la API carga sus dependencias (prueba de regresión) |

## 3. Causa

Técnica: npm dejó `bullmq` y `msgpackr` en `api/node_modules` y `api/Dockerfile` solo copiaba `/app/node_modules` a la
imagen final. De proceso: el smoke test detectó el problema desde el primer día, pero nadie revisó los builds en rojo
durante 5 días. Los cinco porqués están en el issue.

## 4. Qué funcionó y qué no

- **Funcionó:** el smoke test (compara el commit desplegado con el del build) impidió dar por bueno un despliegue que no
  ocurrió; Render no reemplazó la versión anterior; el log de Render mostraba la causa exacta.
- **No funcionó:** nadie miraba el estado del pipeline; la imagen no se probaba antes de desplegarla; el informe de
  pruebas del Sprint 3 del 25/10 no mencionó que el pipeline estaba en rojo.

## 5. Acciones

| N.º | Acción                                                                                                         | Responsable  | Fecha           | Estado      |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------ | --------------- | ----------- |
| 1   | Copiar `api/node_modules` a la imagen (`c1ff200`)                                                              | Lujan        | 30/10/2026      | Hecho       |
| 2   | La imagen ejecuta `require('./dist/app.module')` al construirse: un módulo faltante falla antes de desplegar   | Lujan        | 30/10/2026      | Hecho       |
| 3   | Registrar el riesgo "automatizaciones que fallan o no corren sin que nadie lo note" (con CAL-002, misma causa) | Lujan        | 30/10/2026      | Hecho (R15) |
| 4   | Revisar cada día hábil el último build de develop y los runs de `backup`; un rojo de más de 1 día es defecto   | Galvan (SQA) | Sprint 4, día 1 | Pendiente   |
| 5   | El informe de pruebas de cada sprint enlaza el último build de develop y su resultado                          | Galvan       | Sprint 4        | Pendiente   |

## 6. Firmas

| Nombre | Rol          | Firma |
| ------ | ------------ | ----- |
| Lujan  | Redacta      |       |
| Galvan | Revisa (SQA) |       |
