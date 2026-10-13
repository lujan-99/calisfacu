# US-10 · Control de Entrega de Notas

- **Sprint:** Sprint 2 · **Prioridad:** MEDIA · **Puntos:** valor 5, esfuerzo 3 · **Estado:** Planificada

## Historia

Como secretaria, quiero ver qué profesores ya entregaron sus notas y cuáles faltan por curso, para hacer seguimiento antes del cierre del trimestre.

## Notas y dependencias

Depende de US-01 y US-18. (Valores estimados: validar con el dueño del producto.)

## Criterios de aceptación

1. Dado un trimestre en curso, cuando la secretaria abre el control, entonces ve por curso cada materia con su profesor y su estado Entregado o Pendiente.  
   _Prueba: Cypress_
2. Dado una materia, cuando el profesor la marca como entregada, entonces solo se acepta si todos los estudiantes tienen nota en todas las actividades.  
   _Prueba: Jest (unitaria)_

## Tareas

| ID    | Tarea                                         | Tipo       | Responsable | Revisor | Horas | Cubre        |
| ----- | --------------------------------------------- | ---------- | ----------- | ------- | ----- | ------------ |
| T-040 | API y pantalla de control de entrega de notas | Full stack | Galvan      | Lujan   | 4     | US-10 CA 1–2 |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
