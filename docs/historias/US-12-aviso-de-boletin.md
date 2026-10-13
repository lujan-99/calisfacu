# US-12 · Aviso de Boletín

- **Sprint:** Sprint 4 · **Prioridad:** BAJA · **Puntos:** valor 3, esfuerzo 2 · **Estado:** Planificada

## Historia

Como padre de familia, quiero recibir una notificación cuando el boletín de mi hijo esté disponible, para enterarme a tiempo de sus resultados.

## Notas y dependencias

Depende de US-07, US-11 y US-20. Usa el mismo canal de notificación que US-08. (Valores estimados: validar con el dueño del producto.)

## Criterios de aceptación

1. Dado un boletín recién publicado, cuando termina la publicación, entonces cada padre vinculado recibe un correo en 15 minutos o menos.  
   _Prueba: Jest + Supertest (e2e)_

## Tareas

| ID    | Tarea                                                                  | Tipo       | Responsable | Revisor | Horas | Cubre      |
| ----- | ---------------------------------------------------------------------- | ---------- | ----------- | ------- | ----- | ---------- |
| T-062 | Aviso por correo al publicar un boletín (reutiliza las notificaciones) | Full stack | Galvan      | Lujan   | 2     | US-12 CA 1 |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
