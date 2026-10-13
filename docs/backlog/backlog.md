# Pila de producto de CalisFacu v1.0

> Versión en Markdown de `backlog_v2_4sprints.xlsx` (entregable del curso). Si una cambia, la otra se
> actualiza en el mismo pull request (SQAP, Sección 10.7). Se regenera con `docs/herramientas/gen_backlog_md.py`.

- 4 sprints de **1 semana** · equipo de 2 (Lujan y Galvan) · velocidad supuesta: 20 puntos por semana.
- US-17 a US-20 son historias nuevas propuestas en la revisión del backlog.
- El módulo de pagos (US-13 a US-16) queda **fuera de la v1.0** (Release 2).

## Plan de sprints

- **Sprint 1** (20 puntos): [US-17 Autenticación y Roles](../historias/US-17-autenticacion-y-roles.md), [US-18 Gestión Académica Base](../historias/US-18-gestion-academica-base.md), [US-01 Registro Central de Notas](../historias/US-01-registro-central-de-notas.md), [US-02 Cálculo Automático de Promedios](../historias/US-02-calculo-automatico-de-promedios.md)
- **Sprint 2** (21 puntos): [US-04 Corrección Auditable de Notas](../historias/US-04-correccion-auditable-de-notas.md), [US-03 Historial Académico del Estudiante](../historias/US-03-historial-academico-del-estudiante.md), [US-19 Registro de Asistencia](../historias/US-19-registro-de-asistencia.md), [US-05 Importación desde Excel](../historias/US-05-importacion-desde-excel.md), [US-10 Control de Entrega de Notas](../historias/US-10-control-de-entrega-de-notas.md)
- **Sprint 3** (21 puntos): [US-06 Panel de Riesgo Académico](../historias/US-06-panel-de-riesgo-academico.md), [US-07 Boletín de Notas en PDF](../historias/US-07-boletin-de-notas-en-pdf.md), [US-20 Vinculación Padre–Estudiante](../historias/US-20-vinculacion-padre-estudiante.md), [US-11 Consulta de Boletín](../historias/US-11-consulta-de-boletin.md)
- **Sprint 4** (18 puntos): [US-09 Centralización de Notas](../historias/US-09-centralizacion-de-notas.md), [US-08 Alerta de Promedio Bajo](../historias/US-08-alerta-de-promedio-bajo.md), [US-12 Aviso de Boletín](../historias/US-12-aviso-de-boletin.md)
- **Release 2 (fuera de v1.0)** (24 puntos): [US-16 Control de Pagos](../historias/US-16-control-de-pagos.md), [US-13 Estado de Mensualidades](../historias/US-13-estado-de-mensualidades.md), [US-15 Recordatorio de Pago](../historias/US-15-recordatorio-de-pago.md), [US-14 Pago en Línea](../historias/US-14-pago-en-linea.md)

## Historias

| ID    | Historia                           | Sprint                    | Prioridad | Valor | Esfuerzo | ROI  |
| ----- | ---------------------------------- | ------------------------- | --------- | ----- | -------- | ---- |
| US-17 | Autenticación y Roles              | Sprint 1                  | ALTA      | 13    | 5        | 2.6  |
| US-18 | Gestión Académica Base             | Sprint 1                  | ALTA      | 13    | 5        | 2.6  |
| US-01 | Registro Central de Notas          | Sprint 1                  | ALTA      | 13    | 5        | 2.6  |
| US-02 | Cálculo Automático de Promedios    | Sprint 1                  | ALTA      | 13    | 5        | 2.6  |
| US-04 | Corrección Auditable de Notas      | Sprint 2                  | ALTA      | 8     | 3        | 2.67 |
| US-03 | Historial Académico del Estudiante | Sprint 2                  | ALTA      | 10    | 5        | 2    |
| US-19 | Registro de Asistencia             | Sprint 2                  | ALTA      | 8     | 5        | 1.6  |
| US-05 | Importación desde Excel            | Sprint 2                  | MEDIA     | 8     | 5        | 1.6  |
| US-10 | Control de Entrega de Notas        | Sprint 2                  | MEDIA     | 5     | 3        | 1.67 |
| US-06 | Panel de Riesgo Académico          | Sprint 3                  | ALTA      | 10    | 5        | 2    |
| US-07 | Boletín de Notas en PDF            | Sprint 3                  | MEDIA     | 13    | 8        | 1.63 |
| US-20 | Vinculación Padre–Estudiante       | Sprint 3                  | MEDIA     | 5     | 3        | 1.67 |
| US-11 | Consulta de Boletín                | Sprint 3                  | MEDIA     | 8     | 5        | 1.6  |
| US-09 | Centralización de Notas            | Sprint 4                  | MEDIA     | 8     | 8        | 1    |
| US-08 | Alerta de Promedio Bajo            | Sprint 4                  | BAJA      | 8     | 8        | 1    |
| US-12 | Aviso de Boletín                   | Sprint 4                  | BAJA      | 3     | 2        | 1.5  |
| US-16 | Control de Pagos                   | Release 2 (fuera de v1.0) | MEDIA     | 8     | 5        | 1.6  |
| US-13 | Estado de Mensualidades            | Release 2 (fuera de v1.0) | MEDIA     | 8     | 3        | 2.67 |
| US-15 | Recordatorio de Pago               | Release 2 (fuera de v1.0) | BAJA      | 5     | 3        | 1.67 |
| US-14 | Pago en Línea                      | Release 2 (fuera de v1.0) | MEDIA     | 13    | 13       | 1    |

## Definition of Ready

- Tiene enunciado Como / Quiero / Para, alias y puntos de historia. _(se comprueba en: Hoja Historias de Usuario)_
- Tiene criterios de aceptación en formato Dado / Cuando / Entonces. _(se comprueba en: Hoja Criterios de aceptación)_
- No le queda ningún ❓ sin resolver. _(se comprueba en: Respuesta del cliente anotada en la hoja)_
- Sus dependencias están en un sprint anterior o primero en el mismo sprint. _(se comprueba en: Columna Comentarios)_
- Está dividida en tareas con responsable, revisor y horas. _(se comprueba en: Hoja Tareas (Sprint Backlog))_
- Si es un módulo crítico, su diseño detallado fue revisado. _(se comprueba en: Acta en docs/actas/)_

## Definition of Done

- Definition of Done: una historia está Hecha solo si… _(se comprueba en: Cómo se comprueba)_
- Todos sus criterios de aceptación tienen una prueba automatizada que pasa. _(se comprueba en: Test Result del build de Jenkins)_
- El pipeline está sano: lint, pruebas, cobertura, Quality Gate y auditoría de dependencias en verde. _(se comprueba en: Checks obligatorios del pull request)_
- Cobertura ≥ 80 % en código nuevo y ≥ 90 % en el módulo de cálculo, exigida por la herramienta. _(se comprueba en: coverageThreshold de Jest y Quality Gate)_
- El pull request lo aprobó el otro integrante; nadie aprueba su propio código. _(se comprueba en: Historial del PR en GitHub)_
- Está desplegada en staging y el smoke test pasa con el commit correcto. _(se comprueba en: Job de smoke test)_
- El dueño del producto la revisó en la demo del sprint. _(se comprueba en: Acta de la revisión del sprint)_

## Hallazgos de la revisión del backlog

| N.º | Hallazgo                                                                                                                             | Dónde                          | Por qué importa                                                                                                                                        | Qué se hizo                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | No hay historia de inicio de sesión ni de roles.                                                                                     | Todo el backlog                | RNF-04 y la métrica M09 dependen de que existan roles; sin esto no hay forma de que "solo el docente modifique sus notas".                             | Se propone US-17 (Sprint 1).                                                                                            |
| 2   | No hay historia para registrar cursos, materias, estudiantes, trimestres ni la asignación profesor–materia.                          | Todo el backlog                | US-01 no se puede construir sin esos datos base.                                                                                                       | Se propone US-18 (Sprint 1).                                                                                            |
| 3   | Ninguna historia registra la asistencia.                                                                                             | US-06, US-07                   | Ambas muestran el porcentaje de asistencia, que nadie registra.                                                                                        | Se propone US-19 (Sprint 2).                                                                                            |
| 4   | Nada define qué padre ve a qué estudiante.                                                                                           | US-11, US-12, US-13            | Son datos de menores de edad: un padre podría ver la información de otro estudiante.                                                                   | Se propone US-20 (Sprint 3).                                                                                            |
| 5   | Las historias no tienen criterios de aceptación.                                                                                     | Todas                          | El SQAP (Sección 7) los exige como criterio de entrada; sin ellos no hay pruebas que escribir ni forma de decir "Hecho".                               | Nueva hoja Criterios de aceptación.                                                                                     |
| 6   | El backlog estaba ordenado por ROI ascendente.                                                                                       | Hoja Historias de Usuario      | Un product backlog se ordena por prioridad: lo más importante arriba.                                                                                  | Ordenado por sprint y luego por prioridad.                                                                              |
| 7   | El plan tenía 8 sprints; el equipo trabaja en 4.                                                                                     | Columna Iteración              | Con 2 personas, el backlog completo (incluidas las historias nuevas) no cabe en 4 sprints.                                                             | Re-planificado en 4 sprints; el módulo de pagos se propone para una versión posterior (ver hoja Plan de sprints).       |
| 8   | El módulo de pagos eleva el nivel de integridad.                                                                                     | US-13 a US-16                  | Según IEEE 1012 y la guía de la Práctica 7, pagos y datos personales sensibles son nivel 3; exigiría un SQAP más estricto.                             | Fuera de v1.0, a negociar con el docente.                                                                               |
| 9   | Reglas de negocio sin definir.                                                                                                       | US-02, US-06, US-19            | Redondeo, actividades sin notas, licencias en la asistencia y umbral de riesgo no están escritos; es el riesgo R02 del SQAP.                           | Marcadas con ❓ en los criterios; validar con el cliente en la semana 1.                                                |
| 10  | Canal de notificación sin definir.                                                                                                   | US-08, US-12, US-15            | No se puede estimar ni probar una alerta sin saber si es correo, aviso en el sistema o WhatsApp.                                                       | Propuesta: correo + aviso en el sistema.                                                                                |
| 11  | Escala de Puntos Valor mixta (10 no es de Fibonacci).                                                                                | US-03, US-06                   | Mezclar escalas hace que el ROI compare cosas distintas.                                                                                               | Se dejó igual (backlog aprobado); se sugiere usar 1, 2, 3, 5, 8, 13.                                                    |
| 12  | Valores marcados "(Valores estimados)".                                                                                              | Varias historias               | No están validados con el dueño del producto; el ROI y la prioridad pueden cambiar.                                                                    | Se mantiene la nota; validar en la revisión del backlog del Sprint 1.                                                   |
| 13  | Terminología mezclada: profesor/docente, nota/calificación, trimestre/periodo/gestión, boletín/historial.                            | Backlog y SQAP                 | El SQAP, el código y las pruebas deben usar los mismos términos.                                                                                       | Se unificará en el glosario del SQAP (Sección 15).                                                                      |
| 14  | El SQAP dice roles Docente y Administrador; el backlog usa Profesor, Secretaria y Padre de familia.                                  | SQAP Sección 1                 | El plan no es trazable al backlog aprobado.                                                                                                            | Se actualizará el SQAP a partir de este backlog.                                                                        |
| 15  | US-02 dice "según la ponderación que yo defina", pero en Bolivia la fija el Ministerio por dimensión.                                | US-02 y SQAP (RNF-01)          | RM 001/2026: Ser 10, Saber 45, Hacer 40, Autoevaluación 5. Un sistema que deja al profesor cambiar esos pesos produce notas que no valen oficialmente. | Criterios de US-02 y US-18 reescritos; los puntajes se configuran por gestión porque cambian (en 2024 había Decidir 5). |
| 16  | La planilla modelo (2019) es bimestral; desde 2020 la evaluación es trimestral.                                                      | Modelo-Registro-Calificaciones | Si se copia tal cual, el sistema tendría 3 bimestres en vez de 3 trimestres.                                                                           | Se toma su estructura (encabezado, filas, firmas) pero con trimestres.                                                  |
| 17  | La planilla oficial exige datos que el backlog no guardaba: código SIE, nivel, año de escolaridad, paralelo y firma del director(a). | US-07, US-09, US-18            | Sin esos datos el boletín y el centralizador no se pueden entregar.                                                                                    | Agregados a los criterios de US-18, US-07 y US-09.                                                                      |
| 18  | El plazo es de 4 semanas: cada sprint dura 1 semana.                                                                                 | Plan de sprints                | 20 puntos por semana con 2 personas es exigente; si la velocidad real es menor, no se termina el Sprint 4.                                             | Duración = 1 semana; regla de recorte: primero US-08 y US-12 (prioridad BAJA).                                          |
