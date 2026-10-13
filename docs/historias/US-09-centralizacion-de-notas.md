# US-09 · Centralización de Notas

- **Sprint:** Sprint 4 · **Prioridad:** MEDIA · **Puntos:** valor 8, esfuerzo 8 · **Estado:** Planificada

## Historia

Como secretaria, quiero que las notas de todos los profesores se centralicen automáticamente al cierre del trimestre, para no tener que recopilarlas y transcribirlas manualmente.

## Notas y dependencias

Depende de US-01, US-02 y US-10. (Valores estimados: validar con el dueño del producto.)

## Criterios de aceptación

1. Dado el cierre del trimestre con todas las materias entregadas, cuando la secretaria ejecuta la centralización, entonces obtiene la planilla consolidada de cada curso con todas sus materias.  
   _Prueba: Cypress_
2. Dado la planilla consolidada, cuando se exporta a PDF o Excel, entonces sigue el formato de la planilla oficial: encabezado (unidad educativa, código SIE, nivel, año de escolaridad, paralelo, gestión), una fila por estudiante (N.º, apellidos y nombres, nota de cada trimestre, observaciones) y espacio para la firma del director(a) y del maestro(a).  
   _Prueba: Jest + Supertest (e2e)_
3. Dado una o más materias pendientes, cuando la secretaria intenta centralizar, entonces el sistema lista las pendientes y no cierra el trimestre.  
   _Prueba: Jest (unitaria)_

## Tareas

| ID    | Tarea                                                                             | Tipo     | Responsable | Revisor | Horas | Cubre        |
| ----- | --------------------------------------------------------------------------------- | -------- | ----------- | ------- | ----- | ------------ |
| T-057 | API de centralización: valida materias pendientes y cierra el trimestre           | Backend  | Lujan       | Galvan  | 4     | US-09 CA 1–2 |
| T-058 | Exportación del centralizador a PDF y Excel con el formato de la planilla oficial | Backend  | Lujan       | Galvan  | 3     | US-09 CA 3   |
| T-059 | Pantalla de centralización                                                        | Frontend | Galvan      | Lujan   | 3     | US-09        |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] La rama sale de `develop`: `feature/US-09-centralizacion-de-notas`.
