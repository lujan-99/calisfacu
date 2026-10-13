# Despliegue

| Ambiente   | Disparo                                             | API                                       | Web                 | Base                           |
| ---------- | --------------------------------------------------- | ----------------------------------------- | ------------------- | ------------------------------ |
| Staging    | merge a `develop`                                   | Render (servicio `calisfacu-api-staging`) | Vercel (preview)    | PostgreSQL de Render (staging) |
| Producción | etiqueta `vX.Y.Z` en `main` + aprobación en Jenkins | Render (`calisfacu-api`)                  | Vercel (producción) | PostgreSQL de producción       |

## Configurar una vez

### Render (API)

1. New → Web Service → repositorio `lujan-99/calisfacu`, **Docker**, Dockerfile `api/Dockerfile`, contexto `.`.
2. Desactivar el **Auto-Deploy** (despliega Jenkins con el Deploy Hook).
3. Variables de entorno: `DATABASE_URL`, `JWT_SECRET` (largo y aleatorio), `JWT_EXPIRES_IN=30m`, `NODE_ENV=production`,
   `CORS_ORIGINS=https://<web>.vercel.app`.
4. Settings → Deploy Hook: copiar la URL a la credencial `render-hook-staging` (o `render-hook-prod`) de Jenkins.
5. Crear un PostgreSQL en Render y usar su _Internal Database URL_ como `DATABASE_URL`.
   El plan gratuito vence a los 30 días y no tiene respaldos (riesgo R10): por eso existe `backup.yml`.

### Vercel (web)

1. Importar el repositorio, raíz `web`, framework Vite.
2. Variable `VITE_API_URL=https://<api>.onrender.com/api`.
3. `npx vercel link` dentro de `web/` para obtener `orgId` y `projectId` (credenciales de Jenkins).

### Respaldos (GitHub Actions)

Settings → Environments → `production`: secretos `DATABASE_URL` (_External Database URL_) y `BACKUP_PASSPHRASE`.
Cada viernes: Actions → backup → Run workflow con **restaurar = true** (prueba de restauración, M14).

## Verificar un despliegue

```bash
scripts/smoke.sh https://<api>.onrender.com <commit>   # la etapa "Smoke test" lo hace sola
```

El pie de la web muestra los primeros 7 caracteres del commit desplegado.
