# ADR-0001: Monorepo con NestJS (API) y React + Vite (web) en TypeScript

- **Estado:** Aceptada · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** RNF-05, R08

## Contexto

El equipo pasó de Laravel a una pila JavaScript. Son dos personas y 4 semanas: hace falta un solo lenguaje, una sola
herramienta de estilo y una sola forma de correr las pruebas.

## Opciones consideradas

1. **Dos repositorios (API y web):** despliegues independientes · duplica la configuración de CI y de calidad.
2. **Monorepo con workspaces de npm:** una sola configuración de ESLint, Prettier, Husky y Jenkins · el build compila todo.

## Decisión

Monorepo con workspaces `api` (NestJS), `web` (React + Vite) y `e2e` (Cypress), todo en TypeScript estricto.

## Consecuencias

- Un solo `Jenkinsfile` y un solo check obligatorio en los PR.
- La web y la API comparten las mismas reglas de la escala (1 a 100, aprobación con 51), duplicadas a propósito en
  `web/src/lib/notas.ts` solo para validar la entrada; la nota oficial la calcula siempre la API.
- Verificación: M16 (0 errores de lint) en todo el repositorio.
