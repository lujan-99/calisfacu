# Imagen de la API para Render (SAD, Sección 7). Construir desde la raíz del repositorio:
#   docker build -f api/Dockerfile -t calisfacu-api .
# Etapa 1: compila con todas las dependencias.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
COPY e2e/package.json e2e/
ENV CYPRESS_INSTALL_BINARY=0 HUSKY=0
RUN npm ci --ignore-scripts && npm rebuild argon2
COPY api api
RUN npm run -w api build

# Etapa 2: solo las dependencias de producción de la API (sin las de web, e2e ni las de desarrollo).
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
COPY e2e/package.json e2e/
ENV HUSKY=0
RUN npm ci -w api --omit=dev --ignore-scripts && npm rebuild argon2

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/api/package.json api/
COPY --from=build /app/api/dist api/dist
WORKDIR /app/api
EXPOSE 3000
# Aplica las migraciones pendientes; con SEMBRAR=1 (staging) carga el seed sintético si la base está vacía; arranca.
# RENDER_GIT_COMMIT lo define Render (smoke test).
CMD ["sh", "-c", "node ../node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run && if [ \"$SEMBRAR\" = 1 ]; then node dist/database/seed.js; fi && node dist/main.js"]
