# US-17 · Autenticación y Roles

- **Sprint:** Sprint 1 · **Prioridad:** ALTA · **Puntos:** valor 13, esfuerzo 5 · **Estado:** Planificada

## Historia

Como usuario del sistema (profesor, secretaria, padre de familia o administrador), quiero iniciar sesión con mi cuenta y ver solo las opciones de mi rol, para que nadie más pueda ver o modificar las notas que me corresponden.

## Notas y dependencias

NUEVA (propuesta del análisis; requiere aprobación del docente). Base de todas las historias: sin ella no se cumple RNF-04 (solo el docente de la materia modifica notas) ni la métrica M09.

## Criterios de aceptación

1. Dado un usuario con credenciales válidas, cuando inicia sesión, entonces entra a la pantalla de inicio de su rol y solo ve las opciones de ese rol.  
   _Prueba: Cypress · SQAP: RNF-04_
2. Dado un usuario sin rol Profesor, cuando envía una petición a cualquier ruta de escritura de notas, entonces recibe HTTP 403 y no se modifica ningún dato.  
   _Prueba: Jest + Supertest (e2e) · SQAP: M09_
3. Dado 5 intentos fallidos seguidos con la misma cuenta, cuando intenta un sexto, entonces el sistema bloquea el inicio de sesión durante 15 minutos.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_
4. Dado un usuario autenticado sin actividad, cuando pasan 30 minutos, entonces la sesión expira y debe iniciar sesión otra vez.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_

## Tareas

| ID    | Tarea                                                                                                  | Tipo     | Responsable | Revisor | Horas | Cubre            |
| ----- | ------------------------------------------------------------------------------------------------------ | -------- | ----------- | ------- | ----- | ---------------- |
| T-009 | Entidad Usuario y Rol con migración de TypeORM; seed de usuarios sintéticos                            | Backend  | Lujan       | Galvan  | 2     | R07              |
| T-010 | Autenticación JWT con Passport, contraseñas con argon2, bloqueo tras 5 intentos y expiración de sesión | Backend  | Lujan       | Galvan  | 4     | US-17 CA 1, 3, 4 |
| T-011 | Guard de roles y pruebas que exigen HTTP 403 en rutas de escritura de notas                            | Backend  | Lujan       | Galvan  | 3     | M09              |
| T-012 | Pantalla de inicio de sesión y menú por rol                                                            | Frontend | Galvan      | Lujan   | 3     | US-17 CA 1       |
| T-013 | E2E Cypress: inicio de sesión de cada rol                                                              | Prueba   | Galvan      | Lujan   | 2     | M02              |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] La rama sale de `develop`: `feature/US-17-autenticacion-y-roles`.
