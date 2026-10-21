# Acta de revisión del Sprint 2 (demo con el cliente)

> Preparada con la Tabla 11 del SQAP (revisión del sprint). Se completa durante la demo con el cliente.
> Una historia se acepta solo si todos sus criterios del sprint se ven funcionando en staging.

- **Fecha y duración:** 20/10/2026, 16:00–17:00
- **Incremento:** staging en Render, rama `develop`
- **Participantes:** cliente (profesor y secretaria): Profr. Ramiro / Lic. Ana · Lujan · Galvan

---

## 1. Guion de Demostración del Sprint 2

| N.º | Qué se muestra                                                                                                                                            | Dónde     | Historia y Criterio   | Quién  |
| :-: | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------- | :-------------------- | :----- |
|  1  | **Corrección auditable con motivo obligatorio:** El profesor corrige una calificación registrada, el sistema exige justificación obligatoria y la guarda. | Web       | US-04 CA 1            | Galvan |
|  2  | **Bitácora inmutable de solo lectura:** Se abre el historial de auditoría de la nota; se visualiza quién, cuándo, valor anterior y nuevo.                 | Web       | US-04 CA 2            | Galvan |
|  3  | **Recálculo automático inmediato:** La nota trimestral y el estado de aprobación se actualizan en vivo tras la corrección.                                | Web       | US-04 CA 3            | Galvan |
|  4  | **Historial académico anual del estudiante:** Consulta cronológica de trimestres pasados y vigentes, desglose de dimensiones y badges de tendencia.       | Web       | US-03 CA 1            | Galvan |
|  5  | **Control de acceso al historial (HTTP 403):** Intento de consultar un estudiante de otro curso sin asignación responde con error de autorización.        | Web / API | US-03 CA 2            | Lujan  |
|  6  | **Importación de calificaciones desde Excel:** Subida/pegado de planilla con desglose previo de filas válidas vs observadas con motivo.                   | Web       | US-05 CA 1–2          | Galvan |
|  7  | **Confirmación de importación y auditoría:** Se migran las notas válidas y se auditan con origen "IMPORTACIÓN".                                           | Web / API | US-05 CA 3            | Lujan  |
|  8  | **Registro de asistencia por clase:** Marcado ágil (Presente, Licencia, Ausente) y guardado en la fecha en curso.                                         | Web       | US-19 CA 1            | Galvan |
|  9  | **Cálculo de porcentaje de asistencia (D5):** Visualización del porcentaje según (P + L) / Clases × 100.                                                  | Web       | US-19 CA 2            | Galvan |
| 10  | **Bloqueo preventivo de fechas futuras:** Selección de fecha de mañana o posterior en Bolivia queda bloqueada por el sistema.                             | Web       | US-19 CA 3            | Galvan |
| 11  | **Control de entrega de notas por curso:** Secretaría visualiza el estado Entregado / Pendiente de todas las materias por curso.                          | Web       | US-10 CA 1            | Galvan |
| 12  | **Validación de notas completas para entrega:** Materia con notas pendientes no permite marcarse como entregada.                                          | Web       | US-10 CA 2            | Galvan |
| 13  | **Tickets de habilitación de edición:** Profesor solicita ticket para estudiante con notas ya subidas; administrador lo aprueba.                          | Web       | Refinamiento Sprint 1 | Galvan |
| 14  | **Burbuja de unidades educativas:** Secretaría actualiza unidad sin riesgo de borrado en cascada de cursos o estudiantes; campo CI visible.               | Web       | Refinamiento Sprint 1 | Galvan |

---

## 2. Resultado por Historia de Usuario

| Historia de Usuario                          | Criterios Vistos | Estado de Aceptación | Observaciones del Cliente                              |
| :------------------------------------------- | :--------------: | :------------------: | :----------------------------------------------------- |
| **US-04** Corrección auditable de notas      |      3 de 3      |      ☑ Aceptada      | Excelente trazabilidad para justificación ante padres. |
| **US-03** Historial académico del estudiante |      2 de 2      |      ☑ Aceptada      | Vista cronológica muy clara y útil para seguimiento.   |
| **US-19** Registro de asistencia             |      3 de 3      |      ☑ Aceptada      | Marcado rápido muy intuitivo; porcentaje D5 correcto.  |
| **US-05** Importación desde Excel            |      3 de 3      |      ☑ Aceptada      | Facilita la carga de notas sin doble digitación.       |
| **US-10** Control de entrega de notas        |      2 de 2      |      ☑ Aceptada      | Ahorra tiempo a secretaría para el cierre trimestral.  |

---

## 3. Firmas de Conformidad

| Nombre            | Rol                                 | Firma      |
| :---------------- | :---------------------------------- | :--------- |
| **Profr. Ramiro** | Dueño de Producto / Profesor Piloto | _Ramiro_   |
| **Lic. Ana**      | Dueño de Producto / Secretaría      | _Lic. Ana_ |
| **Lujan**         | Líder de Proyecto / Dev Backend     | _Lujan_    |
| **Galvan**        | Responsable SQA / Dev Frontend      | _Galvan_   |
