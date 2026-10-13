# ADR-0002: TypeORM sobre PostgreSQL 16

- **Estado:** Aceptada (reemplaza a Prisma) · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** RNF-01, RNF-04, SQAP Sección 16 (versión 0.13)

## Contexto

Las notas necesitan precisión decimal, transacciones (planilla completa o nada) y restricciones en la base. El plan
inicial era Prisma, pero Prisma descarga binarios propios (schema engine) desde un servidor aparte, lo que complica los
ambientes con red restringida y agrega una dependencia fuera de npm.

## Opciones consideradas

1. **Prisma:** tipado excelente · binarios externos y configuración propia.
2. **TypeORM:** integración oficial con NestJS (`@nestjs/typeorm`), JavaScript puro, migraciones en TypeScript · tipado
   de consultas menos estricto.
3. **SQL a mano con `pg`:** control total · mucho código repetitivo para un equipo de dos.

## Decisión

TypeORM 0.3 con el driver `pg`, `synchronize: false` y migraciones versionadas en `api/src/database/migrations/`.
Tablas y columnas en snake_case con `SnakeNamingStrategy`.

## Consecuencias

- Una sola configuración (`typeorm.config.ts`) para la app, la CLI, el seed y las pruebas.
- Las pruebas e2e reinician el esquema y aplican las migraciones antes de correr: lo mismo que un despliegue nuevo.
- `numeric` llega como texto desde PostgreSQL; se convierte con un `transformer` y el cálculo usa `decimal.js`.
- Cómo crear una migración: `npm run -w api db:migration:generate src/database/migrations/<Nombre>` (ver
  `docs/desarrollo/base-de-datos.md`).
