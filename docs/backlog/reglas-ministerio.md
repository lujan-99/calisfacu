# Reglas de evaluación del Ministerio de Educación

> Reglas que implementa el módulo `api/src/modules/calculo` (US-02, RNF-01). Los puntajes de las dimensiones
> se **configuran por gestión** (tabla `dimensiones_evaluacion`, US-18): no se programan fijos.

| Regla                              | Valor 2026                   | Fuente                                                                                      | Estado                                  |
| ---------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| Periodos de evaluación             | 3 trimestres                 | Reglamento de evaluación RM 0190/2024 (evaluación al cierre del 1.er, 2.º y 3.er trimestre) | Confirmado                              |
| Escala de calificación             | 1 a 100                      | Ministerio de Educación, vigente desde 2013                                                 | Confirmar si se admite 0                |
| Nota mínima de aprobación          | 51                           | Ministerio de Educación, vigente desde 2013                                                 | Confirmado                              |
| Dimensión Ser (puntaje máximo)     | 10                           | RM 001/2026 (5 de enero de 2026). Absorbe a la antigua dimensión Decidir.                   | Confirmado                              |
| Dimensión Saber (puntaje máximo)   | 45                           | RM 001/2026                                                                                 | Confirmado                              |
| Dimensión Hacer (puntaje máximo)   | 40                           | RM 001/2026                                                                                 | Confirmado                              |
| Autoevaluación (puntaje máximo)    | 5                            | RM 001/2026                                                                                 | Confirmado                              |
| Nota anual de la materia           | Promedio de los 3 trimestres | Práctica habitual; no se encontró el texto oficial                                          | ❓ Confirmar con el reglamento completo |
| Suma de dimensiones (debe ser 100) | 100                          | OK                                                                                          | ❓ Confirmar con el cliente             |

## Fórmula

1. Puntos de una dimensión = promedio de las notas de sus actividades × (puntaje máximo de la dimensión / 100).
2. Nota trimestral = suma de los puntos de las cuatro dimensiones, redondeada al entero (0,5 hacia arriba).
3. Aprueba si la nota es ≥ 51.
4. Si una dimensión todavía no tiene actividades con nota, la nota trimestral queda **pendiente** (regla provisional ❓).

## Casos de ejemplo (semilla de la tabla que firma el cliente, riesgo R02)

Son los mismos casos de `api/test/fixtures/casos-calculo.json`, que verifica la prueba `calculo.casos.spec.ts` (M01).

| Caso                                       | Ser | Saber | Hacer | Autoev. | Pts Ser | Pts Saber | Pts Hacer | Pts Autoev. | Sin redondear | Nota | Resultado |
| ------------------------------------------ | --- | ----- | ----- | ------- | ------- | --------- | --------- | ----------- | ------------- | ---- | --------- |
| Caso típico                                | 80  | 80    | 80    | 100     | 8       | 36        | 32        | 5           | 81            | 81   | Aprueba   |
| Frontera: 50,5 se redondea a 51 (aprueba)  | 100 | 50    | 40    | 40      | 10      | 22.5      | 16        | 2           | 50.5          | 51   | Aprueba   |
| Frontera: 50,4 se redondea a 50 (reprueba) | 80  | 52    | 40    | 60      | 8       | 23.4      | 16        | 3           | 50.4          | 50   | Reprueba  |
| Todo al máximo                             | 100 | 100   | 100   | 100     | 10      | 45        | 40        | 5           | 100           | 100  | Aprueba   |
| Todo al mínimo de la escala                | 1   | 1     | 1     | 1       | 0.1     | 0.45      | 0.4       | 0.05        | 1             | 1    | Reprueba  |

## Fuentes

- RM 001/2026, Ministerio de Educación (5 de enero de 2026): Ser 10, Saber 45, Hacer 40, Autoevaluación 5.
- Reglamento de Evaluación RM 0190/2024: evaluación trimestral.
- Escala de 1 a 100 y aprobación con 51: vigente desde 2013.
- Verificar contra el texto oficial antes de firmar la tabla.
