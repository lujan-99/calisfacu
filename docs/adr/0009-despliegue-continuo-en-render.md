# ADR-0009: Despliegue continuo a staging desde el Sprint 1, con API y web en Render

- **Estado:** Aceptada · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** ADR-0003, T-028, T-029, SQAP Secciones 6, 7 y 10, `render.yaml`

## Contexto

El curso exige despliegue continuo desde el primer sprint, y el SQAP pide la demo de cada sprint sobre staging. El
backlog dejaba staging para el Sprint 2 (T-028). Además, el plan usaba dos plataformas: Render para la API y Vercel para
la web. Eso significaba dos cuentas y cinco credenciales en Jenkins, y un despliegue de vista previa de Vercel cuya URL
cambia en cada build, lo que rompe CORS y la etapa E2E.

## Opciones consideradas

1. **Render (API) + Vercel (web):** el plan original · dos plataformas, URL de vista previa variable, más secretos.
2. **Render para todo, definido en `render.yaml`:** una cuenta, un Blueprint crea API, web y base de una vez, URL fijas
   · la web también queda en el plan gratuito de Render (los sitios estáticos no se suspenden).
3. **Auto-Deploy de Render al hacer push:** sin Jenkins en el camino · desplegaría código que no pasó las pruebas.

## Decisión

Opción 2:

- `render.yaml` define `calisfacu-api-staging` (Docker), `calisfacu-web-staging` (sitio estático) y
  `calisfacu-db-staging` (PostgreSQL 16), con Auto-Deploy apagado.
- Jenkins despliega en cada push a `develop`, solo si pasan lint, pruebas y build. Llama a los dos Deploy Hooks con
  `ref=<commit>`, espera con el smoke test a que la API responda con ese commit y corre E2E contra staging.
- La API aplica las migraciones al arrancar. En staging (`SEMBRAR=1`) carga el seed sintético si la base está vacía;
  el seed se niega a correr en producción sin esa variable.
- SonarQube Cloud (T-030, Sprint 2) se activa con `SONAR_HABILITADO=true`. Mientras tanto no bloquea el despliegue.
- T-028 y T-029 pasan al Sprint 1.

## Consecuencias

- Credenciales de Jenkins: `render-hook-staging` y `render-hook-web-staging` (y, en el release, las de producción). Se
  eliminan las de Vercel.
- Render permite una sola base PostgreSQL gratuita por cuenta, y vence a los 30 días. Para producción (T-069) hará falta
  otra base (otro proveedor gratuito o un plan pago). Riesgo R10.
- La API gratuita se suspende tras 15 minutos sin tráfico; el smoke test espera hasta 10 minutos.
- Verificación: el build de `develop` en Jenkins termina con Deploy staging, Smoke test y E2E en verde.
