# AGENTS.md — Instrucciones para asistentes de IA

> Este archivo lo leen los agentes de IA (Claude Code, Codex, Copilot, etc.) antes de trabajar en el repositorio.
> `CLAUDE.md` lo importa. Si una regla de aquí choca con el SQAP, manda el SQAP (`docs/sqap/SQAP-CalisFacu.md`).

## Proyecto

**CalisFacu v1.0**: registro de calificaciones para una unidad educativa del Subsistema de Educación Regular de Bolivia.
Profesores registran notas por dimensión (Ser, Saber, Hacer, Autoevaluación); el sistema calcula la nota trimestral
según la RM 001/2026 del Ministerio de Educación y genera boletines. Equipo de 2 (Lujan y Galvan), 4 sprints de 1 semana.

## Leer antes de cambiar algo

| Para…                          | Lee                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Saber qué construir            | `docs/historias/US-NN-*.md` (criterios Dado/Cuando/Entonces y tareas) y `docs/backlog/backlog.md` |
| Reglas del cálculo             | `docs/backlog/reglas-ministerio.md`                                                               |
| Requerimientos y RNF           | `docs/srs/SRS-CalisFacu.md`                                                                       |
| Arquitectura y modelo de datos | `docs/sad/SAD-CalisFacu.md` y `docs/adr/`                                                         |
| Umbrales de calidad            | `docs/calidad/metricas.md`                                                                        |
| Ramas, commits y releases      | `docs/desarrollo/flujo-git.md` y `docs/adr/0008-desarrollo-directo-en-develop.md`                 |
| Vocabulario                    | `docs/glosario.md`                                                                                |

## Stack

- **API:** NestJS 11 + TypeScript estricto + TypeORM 0.3 + PostgreSQL 16 (`api/`)
- **Web:** React 19 + Vite + TypeScript (`web/`)
- **Pruebas:** Jest + Supertest (API, e2e con PostgreSQL real), Vitest + Testing Library (web), Cypress (`e2e/`), JMeter (`perf/`)
- **CI/CD:** Jenkins Multibranch (`Jenkinsfile`, `jenkins/`); despliegue continuo a staging en Render (`render.yaml`, ADR-0009); respaldos en GitHub Actions (`.github/workflows/backup.yml`)
- **Estilo:** ESLint (typescript-eslint recommended-type-checked) + Prettier; Husky + lint-staged + commitlint

## Comandos

```bash
npm ci                                   # instalar (también instala los hooks)
npm run db:up                            # PostgreSQL y Redis en Docker
npm run -w api db:migrate && npm run -w api seed
npm run -w api start:dev                 # API en :3000 (/api/docs)
npm run -w web dev                       # web en :5173
npm run lint && npm run format:check     # M16: 0 errores y 0 advertencias
npm run -w api test                      # unitarias (rápidas, sin base)
npm run -w api test:cov                  # unitarias + e2e + cobertura (PostgreSQL en :55432; BORRA y recrea calis_test)
npm run -w web test -- --run
npm run ci:local                         # todas las etapas de Jenkins en local
```

## Reglas que no se negocian

1. **Ramas:** se trabaja directo en `develop` (ADR-0008). Nunca commits directos a `main`: solo recibe el PR de release `develop → main`. No reescriba el historial (sin force push).
2. **Commits:** Conventional Commits con referencia, por ejemplo `feat(calculo): ... ` + `Refs: US-02`. commitlint los rechaza si no.
3. **TDD en módulos críticos** (`api/src/modules/{auth,notas,calculo,auditoria}`): primero la prueba que falla. Cobertura ≥ 90 % por módulo (`api/jest.config.ts`) y ≥ 80 % en código nuevo (SonarQube Cloud).
4. **Cada criterio de aceptación tiene una prueba**; los nombres empiezan con "debe…".
5. **Cálculo de notas:** solo en `CalculoService`, con `decimal.js`, nunca con `float`. Los puntajes de las dimensiones se leen de la base (`dimensiones_evaluacion`), nunca se escriben fijos en el código.
6. **Autorización:** toda ruta nueva exige JWT (es el comportamiento por defecto); declare `@Roles(...)` y compruebe la asignación profesor–materia con `AccesoNotasService`. Agregue la ruta a `api/test/autorizacion.e2e-spec.ts` (M09).
7. **Auditoría:** todo cambio de nota inserta un `RegistroAuditoria` en la **misma transacción**. La tabla es de solo inserción (trigger); no escriba código que la actualice o borre.
8. **Base de datos:** `synchronize` siempre en `false`. Todo cambio de esquema es una migración nueva en `api/src/database/migrations/` (`npm run -w api db:migration:generate ...`). No edite migraciones ya fusionadas.
9. **Datos:** solo sintéticos (`seed.ts`, fixtures). Nunca datos reales de estudiantes (son menores de edad).
10. **Secretos:** nunca en el código ni en los logs. Usar variables de entorno (`.env.example` lista las necesarias).
11. **Dependencias:** licencia MIT, Apache-2.0, BSD, ISC o 0BSD; justificar en el commit; si la dependencia tiene scripts de instalación, apruébelos con `npm install-scripts approve` y agregar la fila en `docs/sqap/matrices-sqap.xlsx` (hoja Componentes de terceros). `npm audit --audit-level=high` debe pasar.
12. **Umbrales:** no baje un umbral para que el pipeline pase. Un umbral cambia solo con el procedimiento del SQAP (Sección 16): SQAP, matrices y configuración en el mismo commit.
13. **Documentación viva:** si cambia el comportamiento, actualice en el mismo commit la historia, el SRS, el SAD o el SQAP que corresponda. Si cambia el Excel del backlog, regenere el Markdown con `python3 docs/herramientas/gen_backlog_md.py`.
14. **Si un requisito es ambiguo**, decida una regla razonable, documéntela en el mismo commit (historia, `reglas-ministerio.md` o un ADR) e informe la decisión. Las decisiones vigentes están en `docs/backlog/reglas-ministerio.md` (D1 a D20).

## Convenciones de código

- Términos del dominio en español, según `docs/glosario.md`: `nota`, `actividad`, `trimestre`, `dimension`, `gestion`.
- Clases y DTO en PascalCase (`RegistrarPlanillaDto`); variables y métodos en camelCase; archivos en kebab-case con sufijo de NestJS (`notas.service.ts`).
- Tablas y columnas en snake_case (lo hace `SnakeNamingStrategy`); tablas en plural.
- Endpoints en plural bajo `/api` (`/api/notas/planilla`, `/api/notas/:id/correccion`).
- Pruebas: `*.spec.ts` junto al código; `api/test/*.e2e-spec.ts`; `web/src/**/*.test.tsx`; `e2e/cypress/e2e/*.cy.ts`.
- Mensajes de error para el usuario en español y sin revelar datos internos.

## Fuera de alcance (no tocar sin una solicitud de cambio aprobada)

- Módulo de pagos (US-13 a US-16): Release 2.
- `docs/referencias/`: material del curso y entregas anteriores, solo lectura.
