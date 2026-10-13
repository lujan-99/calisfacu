# Imagen de la API para Render (SAD, Sección 7). Construir desde la raíz del repositorio:
#   docker build -f api/Dockerfile -t calisfacu-api .
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

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/api/package.json api/
COPY --from=build /app/api/dist api/dist
WORKDIR /app/api
EXPOSE 3000
# Aplica las migraciones pendientes y arranca. RENDER_GIT_COMMIT lo define Render (smoke test).
CMD ["sh", "-c", "node ../node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run && node dist/main.js"]
