# CalisFacu v1.0: manual técnico

> T-066 (SQAP, Sección 4). Para quien instala, despliega u opera CalisFacu. Criterio de aceptación: una persona que no
> conoce el proyecto levanta el sistema en una máquina limpia siguiendo solo este manual en 60 minutos o menos. El
> detalle de cada tema está en `docs/desarrollo/`, `jenkins/README.md`, el SAD y los ADR; aquí está lo necesario para
> operar sin leerlos.

> **Verificación del criterio (03/11/2026, Lujan):** en una carpeta vacía se siguió la Sección 3 tal cual (clon,
> `npm ci`, base en Docker, migraciones, seed, API y web). En unos 3 minutos `/api/salud` respondía, el inicio de sesión
> devolvía el usuario y la web cargaba (evidencia: `docs/evidencias/sprint4/backend/capturas/t09-instalacion-limpia.png`).
> Falta que lo repita alguien que no conoce el proyecto, como pide el criterio.

## 1. Qué es y cómo está armado

CalisFacu registra las notas de una unidad educativa del Subsistema de Educación Regular de Bolivia, calcula la nota
trimestral según la RM 001/2026 y genera boletines, planillas centralizadoras y avisos.

```
 Navegador ──► Web (React 19 + Vite, sitio estático) ──HTTPS/JSON──► API (NestJS 11, Node 22)
                                                                     ├──► PostgreSQL 16 (datos, auditoría, bandeja de correos)
                                                                     ├──► Redis 7 (cola de boletines de un curso, ADR-0006)
                                                                     └──► Brevo, API HTTP (correo de avisos, ADR-0011)
```

| Pieza           | Carpeta                        | Notas                                                                      |
| --------------- | ------------------------------ | -------------------------------------------------------------------------- |
| API             | `api/`                         | Prefijo `/api`; documentación Swagger en `/api/docs` (fuera de producción) |
| Web             | `web/`                         | Lee la API de `VITE_API_URL` (se fija al construir)                        |
| Pruebas E2E     | `e2e/`                         | Cypress                                                                    |
| Rendimiento     | `perf/`                        | JMeter (`boletin.jmx`, `planilla.jmx`)                                     |
| CI/CD           | `Jenkinsfile`, `jenkins/`      | Jenkins en Docker con toda la configuración en código                      |
| Infraestructura | `render.yaml`                  | Blueprint de Render para staging                                           |
| Respaldos       | `.github/workflows/backup.yml` | GitHub Actions: respaldo diario cifrado y prueba de restauración semanal   |

Módulos de la API (`api/src/modules/`): `auth` (JWT, roles, límite por IP), `academico` (gestión, cursos, materias,
estudiantes, unidad educativa), `notas` (planillas; avisa los cambios), `calculo` (nota trimestral y anual con
`decimal.js`, historial), `auditoria` (correcciones con solicitud aprobada, registro inmutable), `importacion` (.xlsx),
`asistencia`, `entregas`, `panel` (riesgo), `boletin` (PDF, cola, publicación, consulta del padre), `familias`
(vínculos padre–estudiante), `centralizacion` (planilla oficial PDF/Excel), `notificaciones` (alertas, avisos de
boletín y bandeja de correos) y `salud`. El detalle está en el SAD (`docs/sad/SAD-CalisFacu.md`).

## 2. Requisitos

| Software                | Versión                    | Para qué                                      |
| ----------------------- | -------------------------- | --------------------------------------------- |
| Node.js                 | 22 (`.nvmrc`); npm 10 u 11 | API, web y herramientas                       |
| Docker y Docker Compose | Docker 24 o superior       | PostgreSQL y Redis locales; Jenkins           |
| Git                     | 2.40 o superior            | Código                                        |
| LibreOffice (opcional)  | 7 o superior               | Ver la planilla Excel y recalcular el backlog |

Puertos que se usan en local: 3000 (API), 5173 (web), 55432 (PostgreSQL), 6379 (Redis), 8080 (Jenkins).

## 3. Instalación local (unos 15 minutos)

```bash
git clone https://github.com/lujan-99/calisfacu.git && cd calisfacu
git switch develop
npm ci                               # instala api, web y e2e e instala los hooks de Husky
cp .env.example api/.env             # cambie JWT_SECRET por un valor largo y aleatorio
npm run db:up                        # PostgreSQL en :55432 y Redis en :6379 (Docker)
npm run -w api db:migrate            # crea las tablas
npm run -w api seed                  # datos sintéticos: 1 curso, 30 estudiantes, usuarios de cada rol
npm run -w api start:dev             # API en http://localhost:3000/api
npm run -w web dev                   # web en http://localhost:5173 (otra terminal)
```

Comprobación: `curl http://localhost:3000/api/salud` responde `{"estado":"ok",...}` y en la web se entra con
`profesor@calisfacu.test` / `Calis2026!`. Usuarios del seed (todos con esa contraseña o la de `SEED_PASSWORD`):

| Correo                      | Rol                                                |
| --------------------------- | -------------------------------------------------- |
| `admin@calisfacu.test`      | Administrador                                      |
| `secretaria@calisfacu.test` | Secretaria                                         |
| `profesor@calisfacu.test`   | Profesor (las cuatro materias del curso de prueba) |
| `profesor2@calisfacu.test`  | Profesor sin materias (para probar el 403)         |
| `padre@calisfacu.test`      | Padre de familia (vinculado al primer estudiante)  |

Los datos son siempre sintéticos: nunca se cargan datos reales de estudiantes fuera de producción (son menores de edad).

## 4. Configuración

### 4.1 API (`api/.env` en local; variables del servicio en Render)

| Variable                  | Obligatoria | Valor por defecto              | Qué hace                                                                                  |
| ------------------------- | ----------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Sí          | —                              | Conexión a PostgreSQL                                                                     |
| `JWT_SECRET`              | Sí          | —                              | Firma de los tokens; Render lo genera solo                                                |
| `JWT_EXPIRES_IN`          | No          | `30m`                          | Duración del token; la web lo renueva mientras hay actividad (D11)                        |
| `PORT`                    | No          | `3000`                         | Puerto de la API                                                                          |
| `CORS_ORIGINS`            | No          | `http://localhost:5173`        | Orígenes de la web, separados por coma                                                    |
| `REDIS_URL`               | No          | `redis://localhost:6379`       | Cola de boletines de un curso                                                             |
| `NODE_ENV`                | No          | —                              | `production` activa la CSP estricta y oculta Swagger                                      |
| `SEMBRAR`                 | No          | —                              | `1` carga el seed al arrancar si la base está vacía (solo staging; nunca producción)      |
| `SEED_PASSWORD`           | No          | `Calis2026!`                   | Contraseña de los usuarios del seed                                                       |
| `LIMITE_LOGIN_POR_MINUTO` | No          | `10`                           | Inicios de sesión por minuto y por IP; `0` lo desactiva (CAL-003)                         |
| `TRUST_PROXY`             | No          | `0`                            | Saltos de proxy de confianza para leer la IP real. **Render (detrás de Cloudflare): `2`** |
| `CORREO_API_KEY`          | No          | —                              | Clave de la API de Brevo. Sin ella los avisos quedan solo dentro del sistema (ADR-0011)   |
| `CORREO_REMITENTE`        | Con clave   | `no-responder@calisfacu.test`  | Remitente **verificado** en Brevo                                                         |
| `CORREO_NOMBRE_REMITENTE` | No          | `CalisFacu`                    | Nombre del remitente                                                                      |
| `CORREO_REDIRIGIR_A`      | No          | —                              | Fuera de producción, manda todos los correos a esta casilla (los del seed son ficticios)  |
| `CORREO_API_URL`          | No          | API de Brevo                   | Solo para pruebas (proveedor falso)                                                       |
| `CORREO_INTERVALO_MS`     | No          | `30000`                        | Cada cuánto se revisan los correos pendientes; `0` lo desactiva (pruebas)                 |
| `WEB_URL`                 | No          | primer valor de `CORS_ORIGINS` | Dirección de la web para los enlaces de los correos                                       |

### 4.2 Web (`web/.env`)

| Variable       | Valor                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| `VITE_API_URL` | URL de la API **con** `/api` (por ejemplo `http://localhost:3000/api`) |

Se fija al construir (`npm run -w web build`): si cambia, hay que volver a construir la web.

## 5. Base de datos

- Esquema: solo por migraciones (`api/src/database/migrations/`), con `synchronize: false` siempre. La imagen de Docker
  aplica las pendientes al arrancar.
- Cambiar el modelo: editar la entidad, `npm run -w api db:migration:generate src/database/migrations/Nombre`, revisar
  el SQL, `npm run -w api db:migrate`. Nunca se edita una migración ya publicada en `develop`.
- `registros_auditoria` es de solo inserción: un trigger rechaza `UPDATE` y `DELETE` (ADR-0005). No intente limpiarla.
- Reiniciar la base local (borra todo): `npm run -w api db:reset` y volver a sembrar.
- Respaldos de staging/producción: `.github/workflows/backup.yml` corre cada día a las 03:00 (Bolivia), cifra el volcado
  con `BACKUP_PASSPHRASE` y lo guarda como artefacto; cada viernes restaura el último en una base desechable y verifica
  las tablas (M14). Para restaurar a mano: descargar el artefacto, descifrarlo con `gpg --decrypt` y cargarlo con
  `pg_restore --no-owner --no-privileges -d "$DATABASE_URL"` (sin `--no-owner` falla con el rol `postgres` de Render,
  CAL-002).

## 6. Pruebas

| Qué                              | Comando                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Lint y formato (M16)             | `npm run lint` · `npm run format:check`                                                                   |
| API, unitarias (sin base)        | `npm run -w api test`                                                                                     |
| API, unitarias + e2e + cobertura | `npm run -w api test:cov` (usa `calis_test` en :55432 y **la borra**)                                     |
| Web                              | `npm run -w web test -- --run`                                                                            |
| E2E (Cypress) contra local       | `npx cypress run --project e2e --config baseUrl=http://localhost:5173 --env apiUrl=http://localhost:3000` |
| Todo lo que corre Jenkins        | `npm run ci:local`                                                                                        |
| Dependencias (M08)               | `npm audit --audit-level=high`                                                                            |

Para Cypress con una base aparte (sin tocar la de desarrollo): crear `calis_e2e`, migrarla y sembrarla con
`DATABASE_URL=.../calis_e2e`, levantar la API en otro puerto con `LIMITE_LOGIN_POR_MINUTO=0` y la web con
`VITE_API_URL` apuntando a ella. **Apague esa API antes de correr `test:cov`**: comparte Redis y su worker tomaría los
trabajos de la prueba de la cola de boletines.

## 7. Integración continua (Jenkins)

Jenkins corre en Docker con la configuración en código (`jenkins/casc.yaml`); ver `jenkins/README.md` para instalarlo.
Cada push a `develop` corre: Instalar → Lint → Pruebas (API con PostgreSQL real, web) → Dependencias → Análisis estático
(SonarQube Cloud, Quality Gate «Sonar way») → Build → Deploy staging → Smoke test → E2E contra staging. Las etiquetas
`v*-rc.*` agregan la etapa Rendimiento (JMeter, M03 y M04); las `vX.Y.Z`, la aprobación y el despliegue a producción.

- Jenkins revisa el repositorio cada minuto; si un push no aparece, **Build Now** en `calisfacu » develop`.
- Si «Análisis estático» falla con `Failed to request GET https://sonarcloud.io/...`, es un corte de red con SonarQube
  Cloud: vuelva a correr el build.
- Secretos en `jenkins/secretos/` (un archivo por secreto, sin salto de línea final; no se versiona).

## 8. Despliegue en Render (staging)

`render.yaml` crea la API (Docker), la web (estático), PostgreSQL y Redis (Key Value). Pasos completos en
`docs/desarrollo/despliegue.md`. Lo que hay que cargar a mano en el panel de la API (no va al repositorio):

| Variable             | Valor en staging                                                               |
| -------------------- | ------------------------------------------------------------------------------ |
| `TRUST_PROXY`        | `2` (Cloudflare + balanceador de Render; con `1` el límite por IP no funciona) |
| `CORREO_API_KEY`     | Clave de Brevo (Settings → SMTP & API → API Keys)                              |
| `CORREO_REMITENTE`   | Correo verificado en Brevo (Senders & IP → Senders)                            |
| `CORREO_REDIRIGIR_A` | Casilla del equipo: los usuarios del seed tienen correos ficticios             |

Jenkins despliega con los Deploy Hooks (`jenkins/secretos/render-hook-*`) y luego verifica que `/api/salud` responda
con el commit nuevo (`scripts/smoke.sh`). El pie de la web muestra el commit desplegado. Al cambiar una variable en
Render hay que redesplegar el servicio (**Manual Deploy**) para que la tome.

La base gratuita de Render vence a los 30 días: antes de esa fecha, crear otra con el Blueprint y restaurar el último
respaldo.

## 9. Producción (T-069)

Se habilita en el release: servicios de producción en `render.yaml` con sus Deploy Hooks (`render-hook-prod`,
`render-hook-web-prod`), base PostgreSQL de producción en otro proveedor (Render da una sola gratuita por cuenta),
`NODE_ENV=production`, **sin** `SEMBRAR` ni `CORREO_REDIRIGIR_A`, y el monitor de UptimeRobot sobre su `/api/salud`
(M13). El despliegue lo dispara una etiqueta anotada `vX.Y.Z` en `main` y lo aprueba en Jenkins una persona distinta de
quien creó la etiqueta.

## 10. Operación

| Qué revisar                   | Cómo                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ¿La API está viva?            | `GET /api/salud` (estado, commit y hora). UptimeRobot lo consulta cada 5 minutos                                        |
| Logs                          | Render → servicio → Logs. Los destinatarios de correo no se escriben en el log                                          |
| Correos que no salen          | `SELECT id, estado, intentos, ultimo_error, siguiente_intento FROM correos WHERE estado <> 'ENVIADO' ORDER BY id DESC;` |
| Reenviar un correo fallido    | `UPDATE correos SET estado = 'PENDIENTE', intentos = 0, siguiente_intento = now() WHERE id = …;` (sale en ≤ 30 s)       |
| Boletines de un curso         | Cola `boletines` en Redis; el PDF se guarda 24 horas (D19)                                                              |
| Alguien no puede entrar (429) | Límite de 10 (staging: 20) inicios de sesión por minuto e IP: esperar un minuto. Bloqueo por cuenta: 5 intentos, 15 min |

Estados de un correo: `PENDIENTE` (se reintenta a 1, 2, 4 y 8 minutos), `ENVIADO`, `FALLIDO` (5 intentos o error
definitivo del proveedor) y `SIN_PROVEEDOR` (no había `CORREO_API_KEY` al crearlo; el aviso quedó solo dentro del
sistema).

## 11. Problemas conocidos y solución

| Síntoma                                                                            | Causa y solución                                                                                                                                           |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La API de Render no arranca: `Cannot find module 'bullmq'`                         | La imagen no copió `api/node_modules` (CAL-001). Ya corregido en `api/Dockerfile`; la imagen lo verifica al construir                                      |
| La restauración del respaldo falla con permisos del rol `postgres`                 | Restaurar con `--no-owner --no-privileges` (CAL-002)                                                                                                       |
| El límite de inicios de sesión no corta en Render                                  | `TRUST_PROXY` debe ser `2`                                                                                                                                 |
| La web muestra «No se pudo conectar» en local                                      | `VITE_API_URL` sin `/api` o `CORS_ORIGINS` sin el origen de la web                                                                                         |
| La e2e de la cola de boletines falla solo en local                                 | Hay otra API usando el mismo Redis (ver Sección 6)                                                                                                         |
| `npm install` no aplica un `overrides` nuevo                                       | Usar `npm update <paquete>`                                                                                                                                |
| Al guardar el backlog `.xlsx` con un script se pierden los valores de las fórmulas | Recalcular con `soffice --headless --convert-to xlsx`                                                                                                      |
| Las historias o los 13 casos de M01 vuelven a un estado viejo                      | Se corrió una versión anterior de `gen_backlog_md.py`; desde el 04/11/2026 solo regenera `backlog.md` y `tareas-transversales.md` (`--todo` para lo demás) |

## 12. Referencias

SAD (`docs/sad/`), SQAP (`docs/sqap/`), ADR (`docs/adr/`), decisiones del dominio D1 a D23
(`docs/backlog/reglas-ministerio.md`), flujo de ramas (`docs/desarrollo/flujo-git.md`) y guía para asistentes de IA
(`AGENTS.md`).
