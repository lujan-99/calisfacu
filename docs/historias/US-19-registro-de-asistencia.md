# US-19 · Registro de Asistencia

- **Sprint:** Sprint 2 · **Prioridad:** ALTA · **Puntos:** valor 8, esfuerzo 5 · **Estado:** Planificada

## Historia

Como profesor, quiero registrar la asistencia de mis estudiantes en cada clase, para que el sistema calcule su porcentaje de asistencia sin llevarlo en un cuaderno aparte.

## Notas y dependencias

NUEVA (propuesta del análisis; requiere aprobación del docente). US-06 y US-07 muestran el porcentaje de asistencia, pero ninguna historia lo registraba. Depende de US-18.

## Criterios de aceptación

1. Dado una clase de su materia, cuando el profesor marca a cada estudiante como presente, ausente o con licencia, entonces se guarda la asistencia de esa fecha.  
   _Prueba: Cypress_
2. Dado las asistencias registradas, cuando se calcula el porcentaje, entonces es (presentes + licencias) / clases dictadas × 100, redondeado a un decimal (decisión D5).  
   _Prueba: Jest (unitaria)_
3. Dado una fecha futura, cuando el profesor intenta registrar asistencia, entonces el sistema lo impide.  
   _Prueba: Jest (unitaria)_

## Tareas

| ID    | Tarea                                                           | Tipo     | Responsable | Revisor | Horas | Cubre        |
| ----- | --------------------------------------------------------------- | -------- | ----------- | ------- | ----- | ------------ |
| T-036 | API de asistencia (sin fechas futuras) y cálculo del porcentaje | Backend  | Lujan       | Galvan  | 3     | US-19 CA 1–3 |
| T-037 | Pantalla de toma de asistencia por clase                        | Frontend | Galvan      | Lujan   | 3     | US-19        |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
