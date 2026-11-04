# Lo que falta para cerrar CalisFacu v1.0 (al 04/11/2026)

Todo lo técnico está en `develop`. Esto es lo que queda: casi todo necesita a una persona, al cliente o una firma.
Marque cada casilla al terminar.

## 1. Apenas termine la RC3 (Jenkins `calisfacu » v1.0.0-rc.3`)

- [x] RC3 completada (04/11): boletín p95 22 ms, planilla p95 2,25 s, 0 % de errores.

## 2. Correo real en staging (10 minutos)

- [ ] Crear una cuenta gratuita en <https://www.brevo.com>, verificar el remitente (Senders & IP → Senders) y crear una
      clave (SMTP & API → API Keys).
- [ ] Render → `calisfacu-api-staging` → Environment: `CORREO_API_KEY`, `CORREO_REMITENTE` (el verificado),
      `CORREO_REDIRIGIR_A` (la casilla del equipo). **Manual Deploy.**
- [ ] Probar: entrar como profesor, registrar una nota que deje a un estudiante bajo 51 y ver el correo llegar.

## 3. Con el cliente (Unidad Educativa Nazareno)

| Qué                              | Documento que se llena                                        | Después                                              |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Demo del Sprint 3                | `docs/actas/revision-sprint3.md`                              | Cerrar los issues T-043 a T-051                      |
| Demo del Sprint 4                | copiar `docs/actas/plantilla-acta.md` → `revision-sprint4.md` | Cerrar T-057 a T-062 (están en `estado:en-revision`) |
| Aceptación final (T-064)         | acta de aceptación firmada (misma plantilla)                  | Habilita el release (T-069)                          |
| Inspección Fagan del SRS (T-001) | `docs/actas/inspeccion-fagan-srs.md`                          | Firmas                                               |

## 4. Con otras personas

| Qué                                               | Quién                    | Documento                                                                |
| ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| Prueba de usabilidad (T-054): 5 profesores nuevos | Galvan modera            | `docs/evidencias/usabilidad/prueba-usabilidad-sprint3.md`                |
| Recorrido del manual de usuario (T-065)           | Un profesor piloto       | Anotar el resultado en `docs/manuales/README.md`                         |
| Seguir el manual técnico en otra PC (T-066)       | Galvan (≤ 60 min)        | Anotar el tiempo en `docs/manuales/README.md`                            |
| Auditoría de desarrollo del Sprint 3 (T-055)      | Galvan                   | `docs/actas/auditoria-cierre-sprint3-desarrollo.md`                      |
| Auditoría del SQAP (T-067)                        | Galvan                   | acta nueva con `docs/actas/plantilla-acta.md`                            |
| Verificar CAL-001 a CAL-004 en staging            | Galvan                   | Issues #72 a #75 → `estado:verificado` y cerrar                          |
| Inspección Fagan del SAD (T-003)                  | Inspector de otro equipo | `docs/actas/inspeccion-fagan-sad.md`                                     |
| Firmas de las actas de auditoría                  | Lujan y Galvan           | `docs/actas/auditoria-cierre-sprint3-pruebas.md`, `…-sprint4-pruebas.md` |

## 5. Decisión pendiente del equipo

- [ ] Umbral de p95 para «registrar planilla» (RC1 178 ms; RC2 51,5 s; RC3 2,25 s porque la prueba acumula miles de actividades en una materia y la consulta de alertas crece con ellas; propuesta en
      `docs/evidencias/v1.0.0-rc.2/README.md`; cambio al SQAP, Sección 16).

## 6. Release v1.0 (T-069), al final

Solo después de la aceptación (T-064): PR `develop → main`, CHANGELOG, etiqueta anotada `v1.0.0`, aprobación en Jenkins
por **una persona distinta** de quien creó la etiqueta, y los pasos de producción del manual técnico (Sección 9).
