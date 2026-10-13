# US-05 · Importación desde Excel

- **Sprint:** Sprint 2 · **Prioridad:** MEDIA · **Puntos:** valor 8, esfuerzo 5 · **Estado:** Planificada

## Historia

Como profesor, quiero importar las notas que ya tengo registradas en planillas Excel para migrarlas al sistema sin volver a digitarlas una por una, para que la adopción no me genere doble trabajo.

## Notas y dependencias

Depende de US-01. Las notas importadas pasan por la misma validación y auditoría que US-01 y US-04.

## Criterios de aceptación

1. Dado un archivo .xlsx con la plantilla del sistema, cuando el profesor lo sube, entonces ve una vista previa con las filas válidas y las filas con error antes de confirmar.  
   _Prueba: Cypress_
2. Dado una fila con un estudiante que no existe o una nota fuera de 0 a 100, cuando se importa, entonces esa fila se rechaza con su motivo y no se guarda.  
   _Prueba: Jest + Supertest (e2e) · SQAP: M01_
3. Dado una importación confirmada, cuando termina, entonces cada nota importada queda en la auditoría con origen "importación".  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_

## Tareas

| ID    | Tarea                                                                                                               | Tipo              | Responsable | Revisor | Horas | Cubre        |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | ------- | ----- | ------------ |
| T-038 | Importación .xlsx con exceljs: vista previa, validación por fila, confirmación y auditoría con origen "importación" | Backend (crítico) | Lujan       | Galvan  | 5     | US-05 CA 1–3 |
| T-039 | Pantalla de carga y vista previa de la importación                                                                  | Frontend          | Galvan      | Lujan   | 3     | US-05        |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] La rama sale de `develop`: `feature/US-05-importacion-desde-excel`.
