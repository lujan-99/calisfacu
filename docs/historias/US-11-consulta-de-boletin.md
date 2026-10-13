# US-11 · Consulta de Boletín

- **Sprint:** Sprint 3 · **Prioridad:** MEDIA · **Puntos:** valor 8, esfuerzo 5 · **Estado:** Planificada

## Historia

Como padre de familia, quiero consultar y descargar el boletín de mi hijo desde el sistema, para conocer su rendimiento sin depender de que el estudiante me lo entregue.

## Notas y dependencias

Depende de US-07 y US-20 (mismo sprint: hacer primero US-07 y US-20). (Valores estimados: validar con el dueño del producto.)

## Criterios de aceptación

1. Dado un boletín publicado, cuando el padre lo consulta, entonces puede verlo y descargarlo en PDF.  
   _Prueba: Cypress · SQAP: M02_
2. Dado un boletín que el profesor aún no publicó, cuando el padre entra, entonces no lo ve.  
   _Prueba: Jest + Supertest (e2e)_

## Tareas

| ID    | Tarea                                              | Tipo     | Responsable | Revisor | Horas | Cubre        |
| ----- | -------------------------------------------------- | -------- | ----------- | ------- | ----- | ------------ |
| T-050 | API para publicar y consultar boletines            | Backend  | Lujan       | Galvan  | 2     | US-11 CA 1–2 |
| T-051 | Pantalla del padre para ver y descargar el boletín | Frontend | Galvan      | Lujan   | 3     | US-11        |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] La rama sale de `develop`: `feature/US-11-consulta-de-boletin`.
