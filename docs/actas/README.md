# Actas

Plantilla: [plantilla-acta.md](plantilla-acta.md). Un acta preparada lleva el nombre sin fecha; al cerrarla se renombra
`AAAA-MM-DD-<tipo>-<artefacto>.md` y se guarda el escaneo firmado al lado.

| Acta                                                                          | Tarea | Quién la conduce                | Cuándo                           |
| ----------------------------------------------------------------------------- | ----- | ------------------------------- | -------------------------------- |
| [conformidad-reglas-calculo](conformidad-reglas-calculo.md) (.docx, .pdf)     | T-004 | Lujan; firma el cliente         | Con el cliente, antes de la demo |
| [inspeccion-fagan-srs](inspeccion-fagan-srs.md)                               | T-001 | Galvan (moderador); autor Lujan | Sprint 1                         |
| [inspeccion-fagan-sad](inspeccion-fagan-sad.md)                               | T-003 | Galvan (moderador); autor Lujan | Sprint 1                         |
| [auditoria-cierre-sprint1-desarrollo](auditoria-cierre-sprint1-desarrollo.md) | T-025 | Galvan audita a Lujan           | Día 5 del Sprint 1               |
| [auditoria-cierre-sprint1-pruebas](auditoria-cierre-sprint1-pruebas.md)       | T-026 | Lujan audita a Galvan           | Día 5 del Sprint 1               |

El acta de conformidad se regenera con `python3 docs/herramientas/gen_conformidad_calculo.py` si cambian los casos de
`api/test/fixtures/casos-calculo.json` o las decisiones de `docs/backlog/reglas-ministerio.md`; el PDF, con
`soffice --headless --convert-to pdf --outdir docs/actas docs/actas/conformidad-reglas-calculo.docx`.
