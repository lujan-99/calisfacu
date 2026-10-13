# ADR-0008: Desarrollo directo en develop, con revisión de commits y PR solo para los releases

- **Estado:** Aceptada (reemplaza en parte a ADR-0007) · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** ADR-0007, SQAP Secciones 6 y 10.2, `docs/desarrollo/flujo-git.md`

## Contexto

ADR-0007 pedía una rama `feature/` o `fix/` y un pull request por cada tarea. Con dos personas y sprints de una semana,
abrir, revisar y fusionar un PR por tarea frena la integración más de lo que aporta. El equipo decidió trabajar directo en
`develop`, sin perder la revisión independiente ni el pipeline.

## Opciones consideradas

1. **Mantener ADR-0007 (rama + PR por tarea):** revisión antes de integrar · un PR por tarea con dos personas es lento.
2. **Directo en `develop`, revisión después del push:** integración continua real · un error puede llegar a staging
   antes de que lo revise el otro integrante.
3. **Directo en `develop` y en `main`:** lo más rápido · producción sin revisión: inaceptable.

## Decisión

Opción 2:

- Se trabaja directo en `develop`. Los hooks de Husky corren lint, formato, commitlint y **todas** las pruebas unitarias
  (API y web) antes de cada push.
- Jenkins construye cada push a `develop`: lint, pruebas con cobertura, Quality Gate, build, staging, smoke test y E2E.
  Si `develop` queda en rojo, arreglarlo es lo primero; nadie sube otra cosa encima.
- **Revisión de commits** (SQAP, Sección 6): el otro integrante revisa los commits de `develop` en 1 día hábil, con
  comentarios en el commit de GitHub. Se mantiene la regla de independencia: Galvan revisa los módulos críticos y la API;
  Lujan revisa la interfaz, el Jenkinsfile y los scripts de prueba.
- `main` no cambia: solo recibe un **PR `develop → main`** por release, aprobado por quien no lo abrió y con el check de
  Jenkins en verde. La etiqueta `vX.Y.Z` la aprueba en Jenkins quien no la creó.
- Hotfix: rama `hotfix/CAL-NNN-...` desde `main`, PR a `main` y después `main` se fusiona en `develop` el mismo día.
- `develop` y `main` siguen sin force push ni borrado. El historial no se reescribe.

## Consecuencias

- Desaparece el squash merge por tarea: cada commit de `develop` debe pasar commitlint y citar la historia o el defecto.
- La evidencia de revisión pasa de los PR a los comentarios de commit y al PR de release; la auditoría de cierre de
  sprint (T-025, T-041, T-055) comprueba que todos los commits del sprint tengan revisión.
- El ruleset de `develop` ya no exige PR ni check (GitHub no puede exigir un check antes de un push); el de `main` sí.
- Cambian el SQAP (Sección 10.2), `flujo-git.md`, `CONTRIBUTING.md` y `AGENTS.md`.
