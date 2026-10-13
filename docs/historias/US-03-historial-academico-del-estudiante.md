# US-03 · Historial Académico del Estudiante

- **Sprint:** Sprint 2 · **Prioridad:** ALTA · **Puntos:** valor 10, esfuerzo 5 · **Estado:** Planificada

## Historia

Como profesor, quiero consultar en cualquier momento el historial completo de notas de un estudiante a lo largo del año, para identificar su evolución académica sin tener que buscar en registros físicos anteriores.

## Notas y dependencias

Depende de US-01.

## Criterios de aceptación

1. Dado un estudiante con notas en varios trimestres, cuando el profesor abre su historial, entonces ve las notas y promedios de cada trimestre en orden cronológico.  
   _Prueba: Cypress · SQAP: M02_
2. Dado un estudiante que no cursa ninguna materia del profesor, cuando el profesor intenta abrir su historial, entonces recibe HTTP 403.  
   _Prueba: Jest + Supertest (e2e) · SQAP: M09_

## Tareas

| ID    | Tarea                                                       | Tipo     | Responsable | Revisor | Horas | Cubre             |
| ----- | ----------------------------------------------------------- | -------- | ----------- | ------- | ----- | ----------------- |
| T-034 | API de historial del estudiante con control de acceso (403) | Backend  | Lujan       | Galvan  | 3     | US-03 CA 1–2, M09 |
| T-035 | Pantalla de historial por trimestre                         | Frontend | Galvan      | Lujan   | 3     | US-03             |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
