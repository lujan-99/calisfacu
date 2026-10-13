# Entorno de desarrollo local

## Requisitos

- Node.js 22 (`.nvmrc`), npm 10
- Docker Desktop (PostgreSQL 16 y Redis)
- Git 2.40 o superior

## Primera vez

```bash
git clone https://github.com/lujan-99/calisfacu.git && cd calisfacu
git switch develop
npm ci                                  # instala todo e instala los hooks de Husky
cp .env.example api/.env                # completar JWT_SECRET
npm run db:up                           # PostgreSQL y Redis en Docker
npm run -w api db:migrate               # crea las tablas
npm run -w api seed                     # datos sintéticos
```

Para que la API lea `api/.env`, NestJS usa `@nestjs/config` (se carga solo desde la carpeta `api`).

## Levantar la aplicación

```bash
npm run -w api start:dev                # http://localhost:3000/api · documentación en /api/docs
npm run -w web dev                      # http://localhost:5173
```

Usuarios del seed (contraseña `Calis2026!`, o la de `SEED_PASSWORD`):

| Correo                      | Rol                                               |
| --------------------------- | ------------------------------------------------- |
| `profesor@calisfacu.test`   | Profesor (todas las materias del curso de prueba) |
| `profesor2@calisfacu.test`  | Profesor sin materias (para probar el 403)        |
| `secretaria@calisfacu.test` | Secretaria                                        |
| `padre@calisfacu.test`      | Padre de familia (vinculado al primer estudiante) |
| `admin@calisfacu.test`      | Administrador                                     |

## Comandos frecuentes

| Qué                                                             | Comando                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| Lint y formato (M16)                                            | `npm run lint` · `npm run format:check` · `npm run format` |
| Pruebas unitarias de la API (rápidas)                           | `npm run -w api test`                                      |
| Todas las pruebas de la API con cobertura (requiere PostgreSQL) | `npm run -w api test:cov`                                  |
| Solo e2e de la API                                              | `npm run -w api test:e2e`                                  |
| Pruebas de la web                                               | `npm run -w web test`                                      |
| Todo lo que corre Jenkins, en local                             | `npm run ci:local`                                         |
| Reiniciar la base (borra todo)                                  | `npm run -w api db:reset`                                  |

Las pruebas e2e usan `DATABASE_URL` (por defecto `postgresql://calis:calis@localhost:5432/calis_test`) y **borran esa
base** antes de correr. No apunte `DATABASE_URL` a una base con datos que quiera conservar.
