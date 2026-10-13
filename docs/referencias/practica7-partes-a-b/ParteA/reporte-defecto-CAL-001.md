# Reporte de defecto — CAL-001

| Campo                        | Valor                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Título                       | La exportación a PDF falla con Error 500 en materias con más de 50 alumnos                                               |
| Reportado por / fecha        | Galvan (Tester) / 04/10/2026                                                                                             |
| Módulo / versión             | Exportación Historial / CalisFacu v1.0-RC1                                                                               |
| Entorno                      | Staging, Navegador Chrome v118, Windows 11, MySQL 8                                                                      |
| Severidad (la fija QA)       | S2 Alta: funcionalidad principal sin alternativa; el sistema sigue usable y no hay pérdida de datos (Sección 8 del SQAP) |
| Prioridad (la fija el líder) | P1: se corrige primero porque el cierre de notas de la gestión depende del PDF                                           |
| Estado                       | Asignado                                                                                                                 |
| Requerimiento afectado       | RNF-03 (métrica M03: p95 de Exportar PDF ≤ 2000 ms)                                                                      |

## Pasos para reproducir

1. Iniciar sesión en el sistema con el rol "Docente".
2. Navegar a "Mis Materias" y seleccionar una materia que tenga más de 50 estudiantes inscritos.
3. Hacer clic en el botón superior derecho "Exportar historial a PDF".
4. Esperar la respuesta del servidor.

## Resultado esperado

El sistema procesa las notas y descarga el archivo `historial_materia.pdf`. Bajo la carga de la Sección 5 (100 usuarios concurrentes, 10 min), el p95 de esta operación es ≤ 2000 ms.

## Resultado observado

El navegador se queda cargando y a los 30 segundos muestra un Error HTTP 500 "Maximum execution time exceeded". No se descarga ningún archivo. En la etapa Rendimiento del build de RC1, el 100 % de las peticiones de exportación en materias de más de 50 alumnos terminó en error.

## Evidencia

- Captura de la traza de error de Laravel con el timeout en DomPDF: `docs/evidencias/CAL-001/traza-timeout-dompdf.png`
- Dashboard de JMeter del build de RC1: artefacto `perf/pdf/` en Jenkins (Sección 12 del SQAP)

## Historial

| Fecha      | Estado   | Quién           | Comentario                                                                                                                                                        |
| ---------- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 04/10/2026 | Nuevo    | Galvan (Tester) | Falló la etapa Rendimiento (JMeter) de RC1; se reprodujo manualmente con los pasos de arriba. Severidad S2.                                                       |
| 04/10/2026 | Asignado | Lujan (Líder)   | Prioridad P1 por el cierre de gestión. Asignado a Lujan (backend). SLA S2: respuesta en 1 día hábil, resolución en 2 días hábiles. Relacionado con el riesgo R05. |
