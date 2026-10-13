# US-08 · Alerta de Promedio Bajo

- **Sprint:** Sprint 4 · **Prioridad:** BAJA · **Puntos:** valor 8, esfuerzo 8 · **Estado:** Planificada

## Historia

Como profesor, quiero recibir una alerta automática cuando el promedio de un estudiante caiga por debajo del mínimo aprobatorio, para poder comunicarme con el tutor a tiempo y no enterarme recién al cierre del periodo.

## Notas y dependencias

Depende de US-02 y US-06. Canal de notificación: aviso en el sistema y correo (decisión D7 de `docs/backlog/reglas-ministerio.md`).

## Criterios de aceptación

1. Dado un estudiante con promedio ≥ 51, cuando una nueva nota lo deja por debajo de 51, entonces el profesor recibe un aviso en el sistema y un correo en 5 minutos o menos.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-01_
2. Dado una alerta ya enviada, cuando el promedio sigue por debajo de 51, entonces no se repite hasta que el estudiante vuelva a superar el mínimo.  
   _Prueba: Jest (unitaria)_

## Tareas

| ID    | Tarea                                                                        | Tipo       | Responsable | Revisor | Horas | Cubre        |
| ----- | ---------------------------------------------------------------------------- | ---------- | ----------- | ------- | ----- | ------------ |
| T-060 | Servicio de alertas al recalcular (sin repetir la misma alerta)              | Backend    | Lujan       | Galvan  | 3     | US-08 CA 1–2 |
| T-061 | Notificaciones en el sistema y por correo mediante un proveedor con API HTTP | Full stack | Galvan      | Lujan   | 3     | US-08 CA 1   |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
