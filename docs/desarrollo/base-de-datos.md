# Base de datos (TypeORM + PostgreSQL)

- Entidades: `api/src/database/entities/`. Tablas y columnas en snake_case (`SnakeNamingStrategy`).
- Configuración única: `api/src/database/typeorm.config.ts` (`synchronize: false` siempre).
- Migraciones: `api/src/database/migrations/`, versionadas y revisadas en el PR como cualquier código.

## Cambiar el modelo

```bash
# 1. Editar la entidad
# 2. Generar la migración comparando con una base migrada
npm run -w api db:migration:generate src/database/migrations/AgregarAsistencia
# 3. Revisar el SQL generado; agregar a mano lo que TypeORM no genera (triggers, CHECK)
# 4. Aplicar y probar
npm run -w api db:migrate
npm run -w api test:cov
```

- Nunca se edita una migración que ya está en `develop`: se crea otra.
- Las restricciones importantes van también en la base (ver `1791866200000-AuditoriaInmutable.ts`).
- Producción aplica las migraciones al iniciar el contenedor (`api/Dockerfile`).

## Reglas

- `registros_auditoria` es de solo inserción (trigger). No escriba código que la actualice.
- Las notas son `numeric(5,2)`; el cálculo usa `decimal.js` (ADR-0004).
- Nunca copie datos de producción a otro ambiente (riesgo R07): use `npm run -w api seed`.
