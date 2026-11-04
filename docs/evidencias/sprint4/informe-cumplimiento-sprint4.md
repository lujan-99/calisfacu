# Informe de Cumplimiento de Criterios y Calidad — Sprint 4

> SQAP v1.0, Secciones 6, 7 y 16. Elaborado el 02/11/2026 por Galvan (Tester SQA / Dev Frontend).  
> Proyecto: **CalisFacu v1.0** — Registro de Calificaciones para Educación Regular (Bolivia).  
> Normativa: **Resolución Ministerial 001/2026 del Ministerio de Educación de Bolivia**.

---

> **Actualizado el 04/11/2026 por Lujan** (auditoría T-068, `docs/actas/auditoria-cierre-sprint4-pruebas.md`). La
> versión del 02/11 daba por cumplidos los criterios con pantallas que armaban los datos en el navegador porque la API
> todavía no existía. Esta versión refleja lo que hoy está en `develop`, verificado con pruebas contra la API real. El
> detalle, con capturas, está en `backend/informe-backend-sprint4.pdf`.

## 1. Resumen del Sprint 4

1. **US-09 (Centralización de notas):** la secretaria centraliza cada curso y trimestre cuando todas las materias
   entregaron (si falta alguna, el sistema la lista y no centraliza), cierra el trimestre cuando están centralizados
   todos los cursos y exporta la planilla oficial en PDF y Excel (decisión D21).
2. **US-08 (Alerta de promedio bajo):** al registrar, importar o corregir notas se recalcula la nota trimestral; si
   queda por debajo de 51, el profesor recibe una alerta en el sistema y un correo, que no se repite mientras siga por
   debajo (decisión D22).
3. **US-12 (Aviso de boletín):** al publicar el boletín, cada padre vinculado recibe un aviso en el sistema y un correo
   (decisión D23). El correo sale por la API de Brevo con reintentos (ADR-0011).

---

## 2. Matriz de cumplimiento de criterios de aceptación

### 2.1 US-09 · Centralización de Notas

| Criterio | Descripción                                                                                                       | Prueba que lo verifica                                                              | Estado                    |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------- |
| CA 1     | Con todas las materias entregadas, la secretaria obtiene la planilla consolidada del curso con todas sus materias | `centralizacion.e2e-spec.ts` (API real) y `centralizacion.cy.ts` (Cypress)          | Verificado, falta la demo |
| CA 2     | La exportación a PDF y Excel sigue el formato de la planilla oficial (encabezado, filas, firmas)                  | `exportacion.spec.ts` y `centralizacion.e2e-spec.ts` (descarga y lectura del .xlsx) | Verificado, falta la demo |
| CA 3     | Con materias pendientes, el sistema las lista y no cierra el trimestre                                            | `planilla.spec.ts`, `centralizacion.e2e-spec.ts` y `centralizacion.cy.ts`           | Verificado, falta la demo |

### 2.2 US-08 · Alerta de Promedio Bajo

| Criterio | Descripción                                                                                      | Prueba que lo verifica                                                                                             | Estado                                                |
| -------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| CA 1     | Al caer por debajo de 51, el profesor recibe un aviso en el sistema y un correo en 5 min o menos | `alertas.e2e-spec.ts` (aviso) y `correo-avisos.e2e-spec.ts` (correo con un proveedor falso, incluido un reintento) | Verificado; en staging falta cargar la clave de Brevo |
| CA 2     | La alerta no se repite hasta que el estudiante vuelva a superar el mínimo                        | `reglas-alertas.spec.ts` y `alertas.e2e-spec.ts`                                                                   | Verificado, falta la demo                             |

### 2.3 US-12 · Aviso de Boletín

| Criterio | Descripción                                                                     | Prueba que lo verifica                                                    | Estado                                                |
| -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| CA 1     | Al publicar el boletín, cada padre vinculado recibe un correo en 15 min o menos | `correo-avisos.e2e-spec.ts` (aviso, correo y que republicar no lo repite) | Verificado; en staging falta cargar la clave de Brevo |

---

## 3. Definition of Done

- [x] Código compilable, ESLint y Prettier sin observaciones (M16).
- [x] Pruebas: API 343 (unitarias y e2e con PostgreSQL), web 217 y Cypress 33, en verde en Jenkins.
- [x] Cobertura: 97,8 % de líneas en la API; módulos críticos ≥ 96,9 % (M06); SonarQube Cloud con el Quality Gate
      aprobado (M05, M07).
- [x] `npm audit --audit-level=high` sin vulnerabilidades altas ni críticas (M08).
- [x] Rutas nuevas con su rol y en `autorizacion.e2e-spec.ts` (M09).
- [x] Documentación viva: historias, SAD, decisiones D21 a D23, ADR-0011 y manuales.
- [ ] Demo con el cliente y aceptación de las historias (pendiente).

---

## 4. Estado de las tareas del Sprint 4

| Tarea                   | Descripción                                          | Responsable    | Estado                                                    |
| :---------------------- | :--------------------------------------------------- | :------------- | :-------------------------------------------------------- |
| **T-057**               | API de centralización y cierre del trimestre         | Lujan          | En revisión (`7edfb28`)                                   |
| **T-058**               | Exportación del centralizador a PDF y Excel          | Lujan          | En revisión (`7edfb28`, `9275746`, `54f4242`)             |
| **T-059**               | Pantalla de centralización                           | Galvan         | En revisión (conectada a la API en `a828cb0`)             |
| **T-060**               | Servicio de alertas al recalcular                    | Lujan          | En revisión (`43e1bcd`)                                   |
| **T-061**               | Notificaciones en el sistema y por correo            | Galvan         | En revisión (correo en `0eb3204`, hecho por Lujan)        |
| **T-062**               | Aviso por correo al publicar un boletín              | Galvan         | En revisión (`0eb3204`, hecho por Lujan)                  |
| **T-063**               | RC2 con todas las métricas                           | Galvan         | Ver `docs/evidencias/v1.0.0-rc.2/`                        |
| **T-065**               | Manual de usuario                                    | Galvan         | Redactado (`0350219`); falta el recorrido con un profesor |
| **T-066**               | Manual técnico                                       | Lujan          | Hecho (`0f451fd`); falta que lo siga otra persona         |
| **T-068**               | Auditoría de las evidencias de prueba                | Lujan          | Hecha (acta `auditoria-cierre-sprint4-pruebas.md`)        |
| **T-064, T-067, T-069** | Aceptación del cliente, auditoría del SQAP y release | Lujan / Galvan | Pendientes: dependen de la demo y de Galvan               |
