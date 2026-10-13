# ADR-0004: Cálculo con aritmética decimal y dimensiones configurables por gestión

- **Estado:** Aceptada · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** US-02, US-18, RNF-01, R02, R11

## Contexto

La nota trimestral decide quién aprueba. En punto flotante, `(0.1 + 0.2) / 2` no es `0.15` y un 50,5 puede quedar en
50,4999…, que se redondea a 50: un estudiante aprobado aparecería reprobado. Además, el Ministerio cambia los puntajes
(en 2024 existía Decidir con 5 puntos; la RM 001/2026 lo eliminó).

## Decisión

- `CalculoService` es puro (sin base de datos) y usa `decimal.js` con redondeo `ROUND_HALF_UP`.
- Los puntajes de las dimensiones viven en `dimensiones_evaluacion`, por gestión, y deben sumar 100.
- La nota trimestral se calcula al consultarla; no se guarda.
- Regla provisional (❓): si una dimensión no tiene notas, la nota trimestral queda **pendiente**.

## Consecuencias

- Los casos de la tabla firmada por el cliente viven en `api/test/fixtures/casos-calculo.json` y se prueban con
  `calculo.casos.spec.ts` (M01). Agregar un caso no requiere tocar código.
- Una nueva resolución se aplica configurando la nueva gestión, sin desplegar código.
