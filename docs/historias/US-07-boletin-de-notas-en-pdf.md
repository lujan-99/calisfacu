# US-07 · Boletín de Notas en PDF

- **Sprint:** Sprint 3 · **Prioridad:** MEDIA · **Puntos:** valor 13, esfuerzo 8 · **Estado:** En proceso

## Historia

Como profesor, quiero generar el boletín de calificaciones de cada estudiante con sus notas por materia, promedio final y porcentaje de asistencia en un PDF listo para entregar, para no armar el documento manualmente al cierre de cada periodo.

## Notas y dependencias

Depende de US-02, US-03 y US-19. Riesgo R05 / defecto CAL-001: generación en cola para cursos de más de 50 estudiantes.

## Criterios de aceptación

1. Dado un estudiante, cuando el profesor genera su boletín, entonces el PDF muestra la unidad educativa, el código SIE, el nivel, el año de escolaridad y el paralelo, y por cada materia la nota de cada trimestre, la nota anual y el porcentaje de asistencia, iguales a los que muestra el sistema.  
   _Prueba: Jest + Supertest (e2e) + Cypress · SQAP: M02_
2. Dado 100 usuarios concurrentes durante 10 minutos en staging, cuando se genera el boletín de un estudiante, entonces el p95 es ≤ 2000 ms y la tasa de error < 1 %.  
   _Prueba: JMeter · SQAP: M03, RNF-03_
3. Dado un curso de más de 50 estudiantes, cuando se generan todos los boletines, entonces se procesan en una cola y el profesor recibe un aviso al terminar.  
   _Prueba: Jest + Supertest (e2e) · SQAP: R05, CAL-001_

## Tareas

| ID    | Tarea                                                                               | Tipo     | Responsable | Revisor | Horas | Cubre           |
| ----- | ----------------------------------------------------------------------------------- | -------- | ----------- | ------- | ----- | --------------- |
| T-045 | Generación del boletín en PDF con encabezado oficial (SIE, nivel, año, paralelo)    | Backend  | Lujan       | Galvan  | 5     | US-07 CA 1      |
| T-046 | Cola con BullMQ + Redis para cursos de más de 50 estudiantes, con aviso al terminar | Backend  | Lujan       | Galvan  | 4     | US-07 CA 3, R05 |
| T-047 | Pantalla para generar boletines y ver su estado                                     | Frontend | Galvan      | Lujan   | 2     | US-07           |

## Antes de empezar

- [x] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [x] No quedan ❓ sin respuesta del cliente.
- [x] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
