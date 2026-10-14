# US-18 · Gestión Académica Base

- **Sprint:** Sprint 1 · **Prioridad:** ALTA · **Puntos:** valor 13, esfuerzo 5 · **Estado:** En proceso

## Historia

Como secretaria, quiero registrar la gestión, sus trimestres, los cursos, las materias y los estudiantes, y asignar cada materia a su profesor, para que cada profesor trabaje solo con sus cursos y materias.

## Notas y dependencias

NUEVA (propuesta del análisis; requiere aprobación del docente). US-01 necesita que existan estudiantes, materias, periodos y la asignación profesor–materia.

## Criterios de aceptación

1. Dado el rol Secretaria, cuando registra un curso con paralelo y gestión, entonces el curso queda disponible para asignarle materias y estudiantes.  
   _Prueba: Cypress_
2. Dado un profesor asignado a dos materias, cuando inicia sesión, entonces ve solo esas dos materias.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_
3. Dado un estudiante inscrito en un curso de la gestión, cuando se lo intenta inscribir en otro curso de la misma gestión, entonces el sistema lo rechaza con un mensaje.  
   _Prueba: Jest (unitaria)_
4. Dado un trimestre marcado como cerrado, cuando un profesor intenta registrar o corregir una nota en él, entonces el sistema lo impide.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_
5. Dado el registro de la unidad educativa, cuando se guarda, entonces incluye nombre, código SIE, nivel (Inicial, Primaria o Secundaria), año de escolaridad y paralelo, que luego aparecen en boletines y centralizadores.  
   _Prueba: Jest + Supertest (e2e)_
6. Dado el rol Administrador, cuando configura la gestión, entonces registra las dimensiones de evaluación y su puntaje máximo según la resolución vigente (2026: Ser 10, Saber 45, Hacer 40, Autoevaluación 5) y el sistema exige que sumen 100.  
   _Prueba: Jest (unitaria) · SQAP: RNF-01_
7. Dado un trimestre de la gestión que ya tiene notas registradas, cuando alguien intenta cambiar los puntajes de las dimensiones, entonces el sistema lo impide.  
   _Prueba: Jest + Supertest (e2e) · SQAP: RNF-04_

## Tareas

| ID    | Tarea                                                                                                                                                                  | Tipo              | Responsable | Revisor | Horas | Cubre                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | ------- | ----- | -------------------- |
| T-014 | Modelo académico: gestión, trimestre, unidad educativa (código SIE, nivel, año, paralelo), curso, materia, estudiante, asignación profesor–materia; migraciones y seed | Backend           | Lujan       | Galvan  | 4     | US-18 CA 1–5         |
| T-015 | Configuración de dimensiones por gestión (suman 100; bloqueadas si hay notas) — TDD                                                                                    | Backend (crítico) | Lujan       | Galvan  | 3     | US-18 CA 6–7, RNF-01 |
| T-016 | API CRUD de la secretaria: cursos, materias, estudiantes y asignaciones                                                                                                | Backend           | Lujan       | Galvan  | 4     | US-18 CA 1–3         |
| T-017 | Pantallas de la secretaria para la gestión académica                                                                                                                   | Frontend          | Galvan      | Lujan   | 4     | US-18                |

## Antes de empezar

- [ ] Cumple la Definition of Ready (`docs/backlog/backlog.md`).
- [ ] No quedan ❓ sin respuesta del cliente.
- [ ] Se trabaja directo en `develop`, con commits que citan la historia (ADR-0008).
