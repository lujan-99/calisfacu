# CalisFacu

Sistema web de registro de calificaciones para unidades educativas del Subsistema de Educación Regular de Bolivia.
Calcula la nota trimestral según el reglamento del Ministerio de Educación (RM 001/2026: Ser 10, Saber 45, Hacer 40,
Autoevaluación 5), audita cada corrección y genera boletines con el formato oficial.

**Equipo L-001** · COM450 Calidad de Software · Universidad San Francisco Xavier · Gestión II/2026
Lujan (Líder, Arquitecto, Backend) · Galvan (Responsable SQA, Frontend / Tester)

## Inicio rápido

```bash
npm ci
cp .env.example api/.env        # completar JWT_SECRET
npm run db:up                   # PostgreSQL 16 y Redis (Docker)
npm run -w api db:migrate && npm run -w api seed
npm run -w api start:dev        # http://localhost:3000/api/docs
npm run -w web dev              # http://localhost:5173  (profesor@calisfacu.test / Calis2026!)
```

Más detalle en [`docs/desarrollo/entorno-local.md`](docs/desarrollo/entorno-local.md).

## Estructura

| Carpeta    | Contenido                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| `api/`     | API NestJS + TypeORM: módulos `auth`, `notas`, `calculo`, `auditoria` (críticos) y `salud`; migraciones y seed |
| `web/`     | Aplicación React + Vite                                                                                        |
| `e2e/`     | Pruebas de sistema con Cypress                                                                                 |
| `perf/`    | Planes de carga de JMeter                                                                                      |
| `jenkins/` | Imagen y servicios de Jenkins; `Jenkinsfile` en la raíz                                                        |
| `scripts/` | Smoke test, espera de salud, CI local                                                                          |
| `docs/`    | Todos los documentos del proyecto (ver abajo)                                                                  |

## Documentos

Todo está en [`docs/`](docs/README.md), en el formato original (Word, PDF, Excel) **y** en Markdown para que lo lean
personas e IA:

- **Calidad:** [SQAP v1.0](docs/sqap/SQAP-CalisFacu.md) · [métricas](docs/calidad/metricas.md) · [matrices](docs/sqap/matrices-sqap.md)
- **Producto:** [backlog](docs/backlog/backlog.md) · [historias](docs/historias/) · [reglas del Ministerio](docs/backlog/reglas-ministerio.md)
- **Ingeniería:** [SRS](docs/srs/SRS-CalisFacu.md) · [SAD](docs/sad/SAD-CalisFacu.md) · [ADR](docs/adr/)
- **Cómo trabajar:** [flujo de Git](docs/desarrollo/flujo-git.md) · [pruebas](docs/desarrollo/pruebas.md) · [despliegue](docs/desarrollo/despliegue.md) · [Jenkins](jenkins/README.md)
- **Para la IA:** [AGENTS.md](AGENTS.md)

## Calidad

| Qué                                       | Umbral                     | Dónde se exige                      |
| ----------------------------------------- | -------------------------- | ----------------------------------- |
| Cobertura de módulos críticos             | ≥ 90 %                     | `api/jest.config.ts`                |
| Cobertura de código nuevo                 | ≥ 80 %                     | Quality Gate de SonarQube Cloud     |
| Lint y formato                            | 0 errores, 0 advertencias  | Husky y Jenkins                     |
| Rutas protegidas que rechazan sin permiso | 100 %                      | `api/test/autorizacion.e2e-spec.ts` |
| Cambios de nota auditados                 | 100 %                      | `api/test/auditoria.e2e-spec.ts`    |
| Boletín bajo carga                        | p95 ≤ 2000 ms, error < 1 % | etapa Rendimiento del `Jenkinsfile` |
