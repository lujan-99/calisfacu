# US-01 · Registro Central de Notas

- **Sprint:** Sprint 1 · **Prioridad:** ALTA · **Puntos:** valor 13, esfuerzo 5 · **Estado:** Planificada

## Historia

Como profesor, quiero registrar las calificaciones de cada estudiante por materia, actividad y periodo en un sistema único, para dejar de tener notas dispersas entre cuadernos, Excel y mensajes de WhatsApp.

## Notas y dependencias

Depende de US-17 y US-18. Módulo crítico del SQAP (TDD obligatorio).

## Criterios de aceptación

1. Dado un profesor en una materia asignada y un trimestre abierto, cuando registra la nota de una actividad dentro de una dimensión (Ser, Saber, Hacer o Autoevaluación) en la escala de 1 a 100, entonces la nota se guarda y aparece en la planilla.  
   _Prueba: Cypress · SQAP: M02_
2. Dado un valor fuera de 1 a 100 (no se admite 0; una actividad no presentada se registra con 1, decisión D1), vacío o no numérico, cuando intenta guardar, entonces aparece un mensaje junto al campo y no se guarda nada.  
   _Prueba: Jest (unitaria) · SQAP: M01_
3. Dado una planilla con las notas de todos los estudiantes de la materia (hasta 60), cuando guarda, entonces se guardan todas o ninguna (una sola transacción).  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-02_
4. Dado 100 profesores registrando notas al mismo tiempo durante 10 minutos, cuando se mide en staging, entonces la tasa de error es menor que 1 %.  
   _Prueba: JMeter · SQAP: M04_

## Tareas

| ID    | Tarea                                                                                | Tipo              | Responsable | Revisor | Horas | Cubre             |
| ----- | ------------------------------------------------------------------------------------ | ----------------- | ----------- | ------- | ----- | ----------------- |
| T-018 | TDD: validación de notas (1 a 100) y guardado de la planilla en una sola transacción | Backend (crítico) | Lujan       | Galvan  | 4     | US-01 CA 2–3, M01 |
| T-019 | Endpoint para registrar notas por actividad y dimensión                              | Backend (crítico) | Lujan       | Galvan  | 3     | US-01 CA 1        |
| T-020 | Planilla de registro de notas por dimensión                                          | Frontend          | Galvan      | Lujan   | 4     | US-01 CA 1        |
| T-021 | E2E Cypress: Registrar calificación                                                  | Prueba            | Galvan      | Lujan   | 2     | M02               |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
