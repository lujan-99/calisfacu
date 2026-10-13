# US-20 · Vinculación Padre–Estudiante

- **Sprint:** Sprint 3 · **Prioridad:** MEDIA · **Puntos:** valor 5, esfuerzo 3 · **Estado:** Planificada

## Historia

Como secretaria, quiero vincular la cuenta de cada padre de familia con sus hijos, para que cada padre vea únicamente la información de sus propios hijos.

## Notas y dependencias

NUEVA (propuesta del análisis; requiere aprobación del docente). US-11 y US-12 dicen "mi hijo", pero nada define qué hijo es de quién. Sin esto, un padre podría ver datos de otro estudiante (datos de menores).

## Criterios de aceptación

1. Dado la secretaria, cuando vincula una cuenta de padre con uno o más estudiantes, entonces el padre ve solo a esos estudiantes.  
   _Prueba: Cypress · SQAP: RNF-04_
2. Dado un padre, cuando intenta ver los datos de un estudiante no vinculado (por ejemplo, cambiando el ID en la URL), entonces recibe HTTP 403.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_

## Tareas

| ID    | Tarea                                                            | Tipo     | Responsable | Revisor | Horas | Cubre        |
| ----- | ---------------------------------------------------------------- | -------- | ----------- | ------- | ----- | ------------ |
| T-048 | API de vinculación padre–estudiante y guard de pertenencia (403) | Backend  | Lujan       | Galvan  | 3     | US-20 CA 1–2 |
| T-049 | Pantalla de la secretaria para vincular padres                   | Frontend | Galvan      | Lujan   | 2     | US-20        |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
