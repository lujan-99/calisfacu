# Cómo contribuir

El flujo completo está en [`docs/desarrollo/flujo-git.md`](docs/desarrollo/flujo-git.md) (ADR-0008). En resumen:

1. Toma una tarea de la pila del sprint (`docs/historias/US-NN-*.md`) y trabaja en `develop` (`git pull` antes).
2. Escribe primero la prueba (TDD obligatorio en `auth`, `notas`, `calculo` y `auditoria`).
3. Commits en Conventional Commits con `Refs: US-NN`; Husky corre lint y pruebas antes del commit y del push.
4. Después del push, revisa que el build de Jenkins de `develop` quede en verde. Si queda en rojo, arréglalo antes que nada.
5. El otro integrante revisa tus commits en 1 día hábil (comentarios en el commit de GitHub).

Los releases van por PR `develop → main`, aprobado por quien no lo abrió. Si Jenkins no está disponible:
`npm run ci:local`.
