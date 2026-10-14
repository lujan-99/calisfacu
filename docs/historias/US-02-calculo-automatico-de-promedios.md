# US-02 · Cálculo Automático de Promedios

- **Sprint:** Sprint 1 · **Prioridad:** ALTA · **Puntos:** valor 13, esfuerzo 5 · **Estado:** En proceso

## Historia

Como profesor, quiero que el sistema calcule automáticamente el promedio y la nota final de cada estudiante por periodo según la ponderación que yo defina para cada tipo de actividad, para evitar errores de cálculo manual y ahorrar horas al cierre de trimestre.

## Notas y dependencias

Depende de US-01 y US-18. Módulo crítico del SQAP (TDD, cobertura ≥ 90 %). Se adelanta al Sprint 1 porque es el núcleo del sistema y el mayor riesgo (R02). Importante: las ponderaciones no las decide el profesor; las fija el Ministerio de Educación por dimensión (RM 001/2026: Ser 10, Saber 45, Hacer 40, Autoevaluación 5). El profesor define las actividades dentro de cada dimensión (ver hoja Reglas MinEdu).

## Criterios de aceptación

1. Dado las notas de las actividades de una dimensión, cuando se calcula, entonces el puntaje de la dimensión es el promedio de esas notas × (puntaje máximo de la dimensión / 100). Ej.: Saber con promedio 80 → 80 × 45/100 = 36 puntos.  
   _Prueba: Jest (unitaria, TDD) · SQAP: M01, M06_
2. Dado los puntajes de Ser, Saber, Hacer y Autoevaluación, cuando se calcula la nota del trimestre, entonces es la suma de los cuatro, redondeada al entero más cercano (0,5 hacia arriba), en la escala de 1 a 100.  
   _Prueba: Jest (unitaria, TDD) · SQAP: M01, RNF-01_
3. Dado una nota trimestral de 50,5 antes de redondear, cuando se redondea, entonces es 51 y el estudiante figura como aprobado; con 50,4 es 50 y figura como reprobado (nota mínima de aprobación: 51).  
   _Prueba: Jest (unitaria, TDD) · SQAP: RNF-01, R02_
4. Dado las notas de los tres trimestres, cuando se calcula la nota anual de la materia, entonces es el promedio de los tres trimestres redondeado al entero, 0,5 hacia arriba (decisiones D2 y D3).  
   _Prueba: Jest (unitaria, TDD) · SQAP: RNF-01, R02_
5. Dado la tabla de casos de prueba firmada por el cliente (semilla en la hoja Reglas MinEdu), cuando corre la suite, entonces el 100 % de los casos da el resultado esperado.  
   _Prueba: Jest (unitaria, TDD) · SQAP: M01, R02_
6. Dado una dimensión que todavía no tiene actividades con nota, cuando se calcula la nota parcial del trimestre, entonces la nota trimestral se muestra como "pendiente" e indica qué dimensiones faltan (decisión D4).  
   _Prueba: Jest (unitaria, TDD) · SQAP: R02_

## Tareas

| ID    | Tarea                                                                                                                                           | Tipo              | Responsable | Revisor | Horas | Cubre                  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | ------- | ----- | ---------------------- |
| T-022 | TDD: servicio de cálculo (puntos por dimensión, nota trimestral, redondeo, aprobación con 51) con aritmética decimal; casos de la tabla firmada | Backend (crítico) | Lujan       | Galvan  | 5     | US-02 CA 1–6, M01, M06 |
| T-023 | Umbral de cobertura ≥ 90 % para el módulo de cálculo en coverageThreshold de Jest                                                               | Calidad           | Lujan       | Galvan  | 1     | M06                    |
| T-024 | Mostrar la nota trimestral y el estado (aprueba / reprueba) en la planilla                                                                      | Frontend          | Lujan       | Galvan  | 2     | US-02                  |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
