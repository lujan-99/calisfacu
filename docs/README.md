# Documentos de CalisFacu

Cada documento está en su formato original (para el curso) y en Markdown (para leerlo en GitHub y para la IA).
Si se cambia uno, se actualiza el otro en el mismo commit.

| Documento                          | Markdown                                                                           | Original                            | Qué es                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| SQAP v1.1                          | [sqap/SQAP-CalisFacu.md](sqap/SQAP-CalisFacu.md)                                   | `sqap/SQAP-CalisFacu.docx` · `.pdf` | Plan de calidad (IEEE 730): métricas, revisiones, pruebas, defectos, riesgos |
| Matrices del SQAP                  | [sqap/matrices-sqap.md](sqap/matrices-sqap.md)                                     | `sqap/matrices-sqap.xlsx`           | Métricas, riesgos, SLA y componentes de terceros                             |
| Métricas (resumen)                 | [calidad/metricas.md](calidad/metricas.md)                                         | —                                   | Umbrales y dónde se configuran                                               |
| Backlog                            | [backlog/backlog.md](backlog/backlog.md)                                           | `backlog/backlog_v2_4sprints.xlsx`  | Pila de producto, plan de 4 sprints, DoR, DoD                                |
| Issues de GitHub                   | [backlog/issues-github.md](backlog/issues-github.md)                               | (GitHub Issues)                     | Un issue por tarea, con responsable, milestone y estado                      |
| Historias                          | [historias/](historias/)                                                           | (hojas del Excel)                   | Una por historia: criterios Dado/Cuando/Entonces y tareas                    |
| Tareas transversales               | [backlog/tareas-transversales.md](backlog/tareas-transversales.md)                 | (hoja Tareas)                       | Calidad e infraestructura                                                    |
| Reglas del Ministerio              | [backlog/reglas-ministerio.md](backlog/reglas-ministerio.md)                       | (hoja Reglas MinEdu)                | Fórmula y casos de cálculo                                                   |
| SRS                                | [srs/SRS-CalisFacu.md](srs/SRS-CalisFacu.md)                                       | `srs/SRS-CalisFacu.docx` · `.pdf`   | Requerimientos                                                               |
| SAD                                | [sad/SAD-CalisFacu.md](sad/SAD-CalisFacu.md)                                       | `sad/SAD-CalisFacu.docx` · `.pdf`   | Arquitectura                                                                 |
| ADR                                | [adr/](adr/)                                                                       | —                                   | Decisiones de arquitectura                                                   |
| Glosario                           | [glosario.md](glosario.md)                                                         | (SQAP, Sección 15)                  | Términos del dominio y técnicos                                              |
| Desarrollo                         | [desarrollo/](desarrollo/)                                                         | —                                   | Git, entorno local, base de datos, pruebas, despliegue                       |
| Plantillas                         | [actas/](actas/), [defectos/](defectos/)                                           | —                                   | Acta de revisión, reporte de defecto, CAL-001                                |
| Evidencias, manuales, capacitación | [evidencias/](evidencias/), [manuales/](manuales/), [capacitacion/](capacitacion/) | —                                   | Se llenan durante los sprints                                                |
| Referencias                        | [referencias/](referencias/)                                                       | PDF, DOCX, XLSX                     | Guías del curso y entregas anteriores (solo lectura)                         |

## Regenerar las versiones en Markdown

```bash
python3 docs/herramientas/gen_backlog_md.py         # backlog e historias desde el Excel (requiere openpyxl)
pandoc docs/sqap/SQAP-CalisFacu.docx -t gfm --wrap=none --extract-media=docs/sqap -o docs/sqap/SQAP-CalisFacu.md
soffice --headless --convert-to pdf --outdir docs/sqap docs/sqap/SQAP-CalisFacu.docx   # PDF (requiere la fuente Carlito)
python3 docs/herramientas/fig_flujo_develop.py docs/sqap/media/image4.png             # Figura 4 del SQAP
```
