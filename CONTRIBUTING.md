# Cómo contribuir

El flujo completo está en [`docs/desarrollo/flujo-git.md`](docs/desarrollo/flujo-git.md). En resumen:

1. Toma una tarea de la pila del sprint (`docs/historias/US-NN-*.md`) y crea la rama desde `develop`:
   `feature/US-NN-descripcion`.
2. Escribe primero la prueba (TDD obligatorio en `auth`, `notas`, `calculo` y `auditoria`).
3. Commits en Conventional Commits con `Refs: US-NN`.
4. Abre el PR hacia `develop` con la plantilla. Lo aprueba el otro integrante; nadie aprueba su propio PR.
5. El check de Jenkins debe estar en verde.

Antes de abrir el PR: `npm run ci:local`.
