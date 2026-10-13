# Despliegue

Despliegue continuo desde el Sprint 1 ([ADR-0009](../adr/0009-despliegue-continuo-en-render.md)): cada push a `develop`
que pasa las pruebas se despliega solo en staging.

| Ambiente   | Disparo                                                  | API (Render, Docker)    | Web (Render, estático)  | Base                   |
| ---------- | -------------------------------------------------------- | ----------------------- | ----------------------- | ---------------------- |
| Staging    | push a `develop` con el build de Jenkins en verde        | `calisfacu-api-staging` | `calisfacu-web-staging` | `calisfacu-db-staging` |
| Producción | etiqueta `vX.Y.Z` en `main` + aprobación de otra persona | se crea en T-069        | se crea en T-069        | se elige en T-069      |

```
push a develop ─► Jenkins: lint ─► pruebas ─► build ─► Deploy Hooks (API y web, ref=commit)
                                                         └─► smoke test (API con ese commit) ─► E2E contra staging
```

## Configurar staging (una vez, ~20 minutos)

### 1. Render: crear todo con el Blueprint

1. Crear una cuenta en <https://render.com> e iniciar sesión con GitHub. Dar acceso al repositorio `lujan-99/calisfacu`.
2. **New → Blueprint** → elegir el repositorio, rama `develop`. Render lee `render.yaml` y crea tres recursos:
   `calisfacu-api-staging`, `calisfacu-web-staging` y `calisfacu-db-staging`. Pulsar **Apply**.
3. Esperar el primer despliegue (la API tarda ~5 minutos en construir la imagen). Comprobar:
   - `https://calisfacu-api-staging.onrender.com/api/salud` responde `{"estado":"ok", ...}`.
   - `https://calisfacu-web-staging.onrender.com` muestra el inicio de sesión; entrar con `profesor@calisfacu.test` /
     `Calis2026!`.
4. Si Render asignó otro dominio (con un sufijo, porque el nombre estaba ocupado), corregir en el panel de Render
   `CORS_ORIGINS` (API) y `VITE_API_URL` (web) y volver a desplegar.
5. En cada servicio: **Settings → Deploy Hook** → copiar la URL. Son secretos: no se pegan en el repositorio ni en el chat.

### 2. Jenkins: credenciales y variables

En Jenkins (ver [`jenkins/README.md`](../../jenkins/README.md)):

| Dónde                                   | Qué                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| Credentials → `render-hook-staging`     | Deploy Hook de `calisfacu-api-staging` (Secret text)                            |
| Credentials → `render-hook-web-staging` | Deploy Hook de `calisfacu-web-staging` (Secret text)                            |
| `jenkins/.env`                          | `STAGING_API_URL` y `STAGING_WEB_URL` (las de Render), `SONAR_HABILITADO=false` |

Después de cambiar `jenkins/.env`: `docker compose -f jenkins/docker-compose.yml --env-file jenkins/.env up -d`.

### 3. Probar la cadena completa

Hacer un push a `develop` (por ejemplo, un cambio de documentación) y comprobar en Jenkins que el build de `develop`
termina con **Deploy staging**, **Smoke test** y **E2E** en verde. El pie de la web muestra los primeros 7 caracteres del
commit desplegado.

## Producción (T-069, Sprint 4)

Se agregan a `render.yaml` los servicios de producción y sus Deploy Hooks (`render-hook-prod`, `render-hook-web-prod`).
Render da **una sola base PostgreSQL gratuita por cuenta**, así que la base de producción se crea en otro proveedor
gratuito (por ejemplo, Neon) o en un plan pago. Producción nunca usa `SEMBRAR`.

### Respaldos (GitHub Actions)

Settings → Environments → `production`: secretos `DATABASE_URL` (_External Database URL_) y `BACKUP_PASSPHRASE`. El
respaldo corre cada día a las 03:00 y la prueba de restauración, el día 5 de cada mes (M14).

## Contingencia: Jenkins apagado

Sin Jenkins no se despliega (riesgo R04). Si hace falta desplegar igual (por ejemplo, para la demo): correr
`npm run ci:local`, guardar el log como evidencia y usar **Manual Deploy → Deploy latest commit** en los dos servicios de
Render.

## Verificar un despliegue a mano

```bash
scripts/smoke.sh https://calisfacu-api-staging.onrender.com "$(git rev-parse HEAD)"
```
