# US-04 · Corrección Auditable de Notas

- **Sprint:** Sprint 2 · **Prioridad:** ALTA · **Puntos:** valor 8, esfuerzo 3 · **Estado:** En proceso

## Historia

Como profesor, quiero corregir una nota ya registrada y que el sistema guarde quién la cambió, cuándo y cuál era el valor anterior, para poder justificar cualquier corrección ante los padres o la dirección académica.

## Notas y dependencias

Depende de US-01. Se propone como tercer módulo crítico del SQAP (cubre RNF-04).

## Criterios de aceptación

1. Dado una nota registrada, cuando el profesor la corrige, entonces el sistema exige un motivo y guarda quién la cambió, la fecha y hora, el valor anterior y el nuevo.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_
2. Dado el registro de auditoría, cuando cualquier usuario intenta editarlo o borrarlo, entonces el sistema no lo permite (solo lectura).  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_
3. Dado una corrección guardada, cuando termina, entonces el promedio afectado se recalcula en la misma transacción.  
   _Prueba: Jest + Supertest (e2e) · SQAP: M01_

## Tareas

| ID    | Tarea                                                                                                               | Tipo              | Responsable | Revisor | Horas | Cubre                |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | ------- | ----- | -------------------- |
| T-031 | TDD: corrección con motivo obligatorio, registro de auditoría de solo inserción y recálculo en la misma transacción | Backend (crítico) | Lujan       | Galvan  | 5     | US-04 CA 1–3, RNF-04 |
| T-032 | Pantalla para corregir una nota con motivo y ver su historial de cambios                                            | Frontend          | Galvan      | Lujan   | 3     | US-04                |
| T-033 | E2E Cypress: corrección auditable                                                                                   | Prueba            | Galvan      | Lujan   | 1     | M02                  |

## Antes de empezar

- [x] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [x] No quedan ❓ sin respuesta del cliente.
- [x] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
