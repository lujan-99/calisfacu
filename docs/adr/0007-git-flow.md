# ADR-0007: Git Flow con develop y main protegidas

- **Estado:** Reemplazada en parte por [ADR-0008](0008-desarrollo-directo-en-develop.md) (ramas de trabajo y PR por tarea) · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** SQAP Sección 10.2 (versión 0.12)

## Contexto

El docente enseñó Git Flow. El equipo quiere separar lo que está en integración (staging) de lo que usa el cliente
(producción).

## Decisión

- `develop`: integración, se despliega a staging en cada merge.
- `main`: solo versiones liberadas; cada release es un PR `develop → main` y una etiqueta `vX.Y.Z`.
- Ramas de trabajo cortas desde `develop` (`feature/`, `fix/`, `docs/`, `ci/`); `hotfix/` desde `main`.
- No se usan ramas `release/*`: el release candidate es la etiqueta `vX.Y.Z-rc.N` sobre `develop`.

## Consecuencias

- Dos ramas protegidas con el mismo ruleset y el mismo check de Jenkins.
- Un hotfix se fusiona a `main` y a `develop` el mismo día.
- Detalle operativo en `docs/desarrollo/flujo-git.md`.
