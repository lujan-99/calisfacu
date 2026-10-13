# US-06 · Panel de Riesgo Académico

- **Sprint:** Sprint 3 · **Prioridad:** ALTA · **Puntos:** valor 10, esfuerzo 5 · **Estado:** Planificada

## Historia

Como profesor, quiero ver en un solo panel el listado de estudiantes de mi curso con su promedio actual y su porcentaje de asistencia, para identificar de un vistazo quiénes están en riesgo académico antes del cierre de periodo.

## Notas y dependencias

Depende de US-02 y US-19.

## Criterios de aceptación

1. Dado un curso del profesor, cuando abre el panel, entonces ve a cada estudiante con su promedio actual y su porcentaje de asistencia.  
   _Prueba: Cypress_
2. Dado un estudiante con promedio menor que 51 o asistencia menor que 80 % (umbral configurable por gestión, decisión D6), cuando se muestra el panel, entonces aparece marcado como "en riesgo".  
   _Prueba: Jest (unitaria) · SQAP: RNF-01_

## Tareas

| ID    | Tarea                                                                           | Tipo     | Responsable | Revisor | Horas | Cubre        |
| ----- | ------------------------------------------------------------------------------- | -------- | ----------- | ------- | ----- | ------------ |
| T-043 | API del panel de riesgo (promedio actual, % de asistencia, umbral configurable) | Backend  | Lujan       | Galvan  | 3     | US-06 CA 1–2 |
| T-044 | Pantalla del panel de riesgo con resaltado                                      | Frontend | Galvan      | Lujan   | 3     | US-06        |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
