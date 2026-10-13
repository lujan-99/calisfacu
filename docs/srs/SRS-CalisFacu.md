---
title: 'CalisFacu v1.0 — Especificación de Requerimientos de Software (SRS)'
subtitle: 'Equipo L-001 · COM450 Calidad de Software · Gestión II/2026 · Versión 1.0'
lang: es
---

# 1. Introducción

## 1.1 Propósito

Este documento especifica **qué** debe hacer CalisFacu v1.0: sus usuarios, funciones, reglas de negocio y requerimientos
no funcionales. Es la base de la inspección Fagan de la semana 1 (SQAP, Sección 6) y de todas las pruebas de aceptación.
El **cómo** está en el SAD (`docs/sad/SAD-CalisFacu.md`).

## 1.2 Alcance

CalisFacu es un sistema web de registro de calificaciones para una unidad educativa del Subsistema de Educación Regular
de Bolivia. Reemplaza las notas dispersas en cuadernos, planillas Excel y mensajes, calcula las notas trimestrales según el
reglamento del Ministerio de Educación y genera boletines y centralizadores con el formato oficial.

- **Incluido en la v1.0:** las 16 historias de la Sección 3 (4 sprints de 1 semana).
- **Fuera de la v1.0:** el módulo de pagos (US-13 a US-16), propuesto para una versión posterior. Si se incluyera, el nivel
  de integridad subiría de 2 a 3 (SQAP, Sección 1).
- CalisFacu **no reemplaza** el registro oficial del Ministerio de Educación: la unidad educativa sigue cargando ahí sus notas.

## 1.3 Definiciones

Los términos del dominio (dimensión, trimestre, gestión, boletín, centralizador, código SIE, etc.) están en
`docs/glosario.md` y en la Sección 15 del SQAP. Este documento los usa con ese significado.

## 1.4 Referencias

| Documento                                          | Ubicación                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pila de producto, criterios de aceptación y tareas | `docs/backlog/backlog.md`, `docs/historias/`, `docs/backlog/backlog_v2_4sprints.xlsx` |
| Reglas de evaluación del Ministerio                | `docs/backlog/reglas-ministerio.md`                                                   |
| SQAP v1.0                                          | `docs/sqap/SQAP-CalisFacu.docx` (y `.md`)                                             |
| SAD v1.0                                           | `docs/sad/SAD-CalisFacu.md`                                                           |
| RM 001/2026 y RM 0190/2024                         | Ministerio de Educación del Estado Plurinacional de Bolivia                           |

# 2. Descripción general

## 2.1 Usuarios

| Rol                  | Quién es                                      | Qué hace en el sistema                                                                                        |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Profesor**         | Docente de una o más materias                 | Registra actividades y notas, corrige notas con motivo, registra asistencia, genera boletines                 |
| **Secretaria**       | Personal de secretaría de la unidad educativa | Registra cursos, materias, estudiantes y asignaciones; vincula padres; controla la entrega y centraliza notas |
| **Padre de familia** | Padre, madre o tutor                          | Consulta y descarga el boletín de sus hijos vinculados; recibe avisos                                         |
| **Administrador**    | Responsable técnico de la unidad educativa    | Configura la gestión (trimestres y dimensiones de evaluación) y los usuarios                                  |

## 2.2 Restricciones

- Las notas son **datos personales de menores de edad** y datos oficiales: cada acceso se controla por rol y por vínculo.
- El cálculo debe seguir el reglamento vigente; los puntajes de las dimensiones cambian por resolución ministerial, así que
  se configuran por gestión y no se programan fijos.
- Equipo de dos personas y 4 semanas de construcción: se priorizan las historias de la Sección 3.
- Infraestructura de planes gratuitos (Render): ver los riesgos R04 y R10 del SQAP.

## 2.3 Supuestos y preguntas abiertas

Las preguntas abiertas se resolvieron el 13/10/2026; la decisión de cada una (D1 a D7) está en
`docs/backlog/reglas-ministerio.md`:

1. ¿La nota anual es el promedio de los tres trimestres? **Sí (D3).**
2. ¿Se admite 0 en una actividad no presentada? **No, la escala es de 1 a 100 (D1).**
3. ¿El redondeo es al entero más cercano, con 0,5 hacia arriba? **Sí (D2).**
4. ¿Una licencia cuenta como asistencia? ¿Cuál es el umbral de asistencia para marcar "en riesgo"? **Sí; menos de 80 %, configurable (D5, D6).**
5. Si una dimensión todavía no tiene notas, ¿la nota trimestral queda "pendiente" o la dimensión cuenta como 0? **Pendiente (D4).**

# 3. Requerimientos funcionales

Cada requerimiento funcional es una historia de usuario. El enunciado completo, los criterios de aceptación (formato
Dado/Cuando/Entonces) y las tareas de cada una están en `docs/historias/US-NN-*.md`.

| ID    | Historia                                                                                               | Rol                       | Sprint   | Prioridad |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------------- | -------- | --------- |
| US-17 | Autenticación y roles                                                                                  | Todos                     | Semana 1 | Alta      |
| US-18 | Gestión académica base (gestión, trimestres, dimensiones, cursos, materias, estudiantes, asignaciones) | Secretaria, Administrador | Semana 1 | Alta      |
| US-01 | Registro central de notas                                                                              | Profesor                  | Semana 1 | Alta      |
| US-02 | Cálculo automático de la nota trimestral                                                               | Profesor                  | Semana 1 | Alta      |
| US-04 | Corrección auditable de notas                                                                          | Profesor                  | Semana 2 | Alta      |
| US-03 | Historial académico del estudiante                                                                     | Profesor                  | Semana 2 | Alta      |
| US-19 | Registro de asistencia                                                                                 | Profesor                  | Semana 2 | Alta      |
| US-05 | Importación de notas desde Excel                                                                       | Profesor                  | Semana 2 | Media     |
| US-10 | Control de entrega de notas                                                                            | Secretaria                | Semana 2 | Media     |
| US-06 | Panel de riesgo académico                                                                              | Profesor                  | Semana 3 | Alta      |
| US-07 | Boletín de notas en PDF                                                                                | Profesor                  | Semana 3 | Media     |
| US-20 | Vinculación padre–estudiante                                                                           | Secretaria                | Semana 3 | Media     |
| US-11 | Consulta de boletín                                                                                    | Padre de familia          | Semana 3 | Media     |
| US-09 | Centralización de notas                                                                                | Secretaria                | Semana 4 | Media     |
| US-08 | Alerta de promedio bajo                                                                                | Profesor                  | Semana 4 | Baja      |
| US-12 | Aviso de boletín publicado                                                                             | Padre de familia          | Semana 4 | Baja      |

## 3.1 Reglas de negocio

| ID    | Regla                                                                                                                                                                                                             | Historias           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| RN-01 | La evaluación es trimestral: una gestión tiene 3 trimestres. Un trimestre cerrado no admite registros ni correcciones.                                                                                            | US-01, US-04, US-18 |
| RN-02 | Las dimensiones de evaluación y su puntaje máximo se configuran por gestión y deben sumar 100. En 2026: Ser 10, Saber 45, Hacer 40, Autoevaluación 5 (RM 001/2026). No se cambian si el trimestre ya tiene notas. | US-02, US-18        |
| RN-03 | Cada actividad pertenece a una materia, un trimestre y una dimensión. Sus notas van de 1 a 100, con hasta dos decimales.                                                                                          | US-01               |
| RN-04 | Puntos de una dimensión = promedio de sus actividades × puntaje máximo / 100. Nota trimestral = suma de las dimensiones, redondeada al entero (0,5 hacia arriba).                                                 | US-02               |
| RN-05 | Se aprueba con 51 o más.                                                                                                                                                                                          | US-02, US-06, US-08 |
| RN-06 | Cada materia tiene un único profesor asignado; solo él registra y corrige sus notas.                                                                                                                              | US-01, US-04, US-18 |
| RN-07 | Una planilla se guarda completa o no se guarda. Una nota ya registrada solo se cambia con una corrección que exige motivo.                                                                                        | US-01, US-04        |
| RN-08 | Toda nota nueva, corregida o importada deja un registro de auditoría (quién, cuándo, valor anterior, valor nuevo, motivo, origen) que no se puede modificar ni borrar.                                            | US-01, US-04, US-05 |
| RN-09 | Un padre solo ve la información de los estudiantes vinculados a su cuenta.                                                                                                                                        | US-11, US-12, US-20 |
| RN-10 | El boletín y el centralizador siguen el formato oficial: unidad educativa, código SIE, nivel, año de escolaridad, paralelo, gestión y espacio para las firmas del director(a) y del maestro(a).                   | US-07, US-09        |

# 4. Requerimientos no funcionales

Cada RNF tiene una métrica verificable del SQAP (Sección 5, M01 a M16).

| Código | Requerimiento                                                                                                                                                                                                                                                                  | Métricas           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| RNF-01 | El cálculo sigue el reglamento vigente (RN-02, RN-04, RN-05); el 100 % de los casos de la tabla firmada por el cliente da el resultado esperado.                                                                                                                               | M01, M06           |
| RNF-02 | Un profesor registra las notas de toda una actividad (hasta 60 estudiantes) en una sola operación, todas o ninguna; el 100 % de los escenarios E2E de registro, corrección y boletín pasan en staging.                                                                         | M02                |
| RNF-03 | El boletín de un estudiante se genera con p95 ≤ 2000 ms y tasa de error < 1 % con 100 usuarios concurrentes durante 10 minutos; la escritura de notas, con tasa de error < 1 % en las mismas condiciones. Los boletines de cursos de más de 50 estudiantes se generan en cola. | M03, M04           |
| RNF-04 | Solo el profesor asignado modifica notas; un padre solo ve a sus hijos; el 100 % de las rutas protegidas rechazan con 403 al usuario sin permiso; el 100 % de los cambios quedan auditados; 0 vulnerabilidades altas o críticas.                                               | M08, M09, M15      |
| RNF-05 | Cobertura ≥ 80 % en código nuevo y ≥ 90 % en módulos críticos; duplicación ≤ 3 %; 0 errores y advertencias de lint y formato.                                                                                                                                                  | M05, M06, M07, M16 |
| RNF-06 | Al menos 4 de 5 profesores que nunca usaron el sistema registran las notas de una actividad sin ayuda; SUS promedio ≥ 68.                                                                                                                                                      | M11, M12           |
| RNF-07 | Producción disponible al menos el 99,0 % del mes; respaldo diario (RPO ≤ 24 h) y restauración en 2 horas o menos (RTO ≤ 2 h).                                                                                                                                                  | M13, M14           |

# 5. Interfaces

- **Usuario:** aplicación web adaptable a teléfono y computadora, en español.
- **API:** REST sobre HTTPS con JSON, prefijo `/api`, autenticación JWT (`Authorization: Bearer`). El contrato se publica
  en OpenAPI en `/api/docs` (fuera de producción).
- **Salud:** `GET /api/salud` devuelve `{ estado, version, fecha }`, donde `version` es el commit desplegado.
- **Archivos:** importación `.xlsx` (US-05); exportación PDF y Excel (US-07, US-09).
- **Correo:** avisos mediante un proveedor con API HTTP (US-08, US-12).

# 6. Criterio de aceptación de este documento

- [ ] Cada historia de la Sección 3 tiene criterios Dado/Cuando/Entonces en `docs/historias/`.
- [ ] Cada RNF tiene métrica y valor verificable.
- [ ] La tabla de casos de cálculo (`docs/backlog/reglas-ministerio.md`) está firmada por el cliente.
- [ ] No quedan ❓ sin respuesta.
- [ ] Acta de la inspección Fagan en `docs/actas/` con 0 defectos mayores abiertos.

# 7. Historial

| Versión | Fecha      | Cambio                                                                                         | Autor | Revisor |
| ------- | ---------- | ---------------------------------------------------------------------------------------------- | ----- | ------- |
| 1.0     | 13/10/2026 | Versión inicial a partir del backlog v2.0, las reglas de la RM 001/2026 y el Anexo A del SQAP. | Lujan | Galvan  |
