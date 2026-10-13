# Pruebas

Estrategia completa en la Sección 7 del SQAP. Qué prueba qué:

| Nivel                       | Dónde                                 | Herramienta                   | Cuándo corre                     | Métricas                                 |
| --------------------------- | ------------------------------------- | ----------------------------- | -------------------------------- | ---------------------------------------- |
| Unitario                    | `api/src/**/*.spec.ts`                | Jest                          | pre-push y cada build            | M01 (tabla de cálculo), M06              |
| Integración (e2e de la API) | `api/test/*.e2e-spec.ts`              | Jest + Supertest + PostgreSQL | cada build                       | M09 (autorización), M15 (auditoría), M06 |
| Web                         | `web/src/**/*.test.ts(x)`             | Vitest + Testing Library      | cada build                       | M05                                      |
| Sistema (E2E)               | `e2e/cypress/e2e/*.cy.ts`             | Cypress                       | cada merge a `develop` (staging) | M02                                      |
| Carga                       | `perf/*.jmx`                          | JMeter 5.6.3                  | cada etiqueta `vX.Y.Z-rc.N`      | M03, M04                                 |
| Usabilidad                  | acta en `docs/evidencias/usabilidad/` | 5 profesores + SUS            | semana 3, día 4                  | M11, M12                                 |

## Reglas

- **TDD obligatorio** en los módulos críticos (`auth`, `notas`, `calculo`, `auditoria`): la prueba se escribe primero.
- Cada criterio de aceptación de `docs/historias/` tiene al menos una prueba; el nombre empieza con "debe…".
- Cada defecto corregido agrega una prueba que lo reproduce.
- Los umbrales viven en un solo lugar del SQAP (Tabla 9) y en la herramienta: `api/jest.config.ts`
  (`coverageThreshold`, 90 % por módulo crítico), Quality Gate de SonarQube Cloud (80 % en código nuevo, 3 % de
  duplicación, Security Rating A) y la etapa Rendimiento del `Jenkinsfile` (p95 ≤ 2000 ms, error < 1 %).
- Datos: solo sintéticos (`seed.ts`, fixtures de `api/test/utils.ts`).

## Tabla de casos del cálculo (M01)

`api/test/fixtures/casos-calculo.json`. Cuando el cliente firme la tabla, se agregan sus casos a ese archivo y a
`docs/backlog/reglas-ministerio.md`; la prueba `calculo.casos.spec.ts` los recorre todos.

## Cypress contra staging

```bash
npx cypress run --project e2e --config baseUrl=https://<web-staging> --env apiUrl=https://<api-staging>
```

## JMeter en local

```bash
npm run -w api build && npm run -w api db:reset && npm run -w api seed:perf
node api/dist/main.js &
jmeter -n -t perf/planilla.jmx -Jusuarios=100 -Jduracion=600 -l perf/planilla.jtl -e -o perf/planilla
```
