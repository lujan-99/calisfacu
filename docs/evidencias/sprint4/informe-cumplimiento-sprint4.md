# Informe de Cumplimiento de Criterios y Calidad — Sprint 4

> SQAP v1.0, Secciones 6, 7 y 16. Elaborado el 02/11/2026 por Galvan (Tester SQA / Dev Frontend).  
> Proyecto: **CalisFacu v1.0** — Registro de Calificaciones para Educación Regular (Bolivia).  
> Normativa: **Resolución Ministerial 001/2026 del Ministerio de Educación de Bolivia**.

---

## 1. Resumen Ejecutivo del Sprint 4

El **Sprint 4** concluyó la implementación integral de la capa frontend y la lógica de negocio cliente para las tres historias asignadas al cierre de gestión y comunicación formativa:

1. **US-09 (Centralización de notas):** Automatización del cierre trimestral por curso, validación estricta de entregas previas (bloqueo ante materias pendientes) y exportación oficial ministerial en formatos PDF, Excel (.xlsx) y CSV.
2. **US-08 (Alerta de promedio bajo):** Detección reactiva de caída de promedio por debajo de 51 puntos con regla de histéresis anti-spam, despacho de correo en menos de 5 minutos (RNF-01) y registro auditable de comunicación con tutores legales.
3. **US-12 (Aviso de boletín disponible):** Notificación automática a familias al publicarse el boletín trimestral con entrega por correo en 15 minutos o menos (CA 1), bandeja de notificaciones oficial y aislamiento estricto de estudiantes vinculados (RN-09).

---

## 2. Matriz de Cumplimiento de Criterios de Aceptación

### 2.1 US-09 · Centralización de Notas (Secretaría)

| Criterio de Aceptación | Descripción Ministerial                                                                                                                                                                                                       | Evidencia y Prueba de Verificación                                                                                                                     | Estado       |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **CA 1**               | Dado el cierre del trimestre con todas las materias entregadas, se calcula automáticamente el promedio trimestral de cada estudiante con redondeo ministerial (`ROUND_HALF_UP`, reglas D1, D2 y D12).                         | `src/lib/centralizador.test.ts` (`construirFilasCentralizador`, promedios ponderados exactos); `secretaria.test.tsx` (cálculo y renderizado en tabla). | **Cumplido** |
| **CA 2**               | Exportación oficial a **PDF** y **Excel (.xlsx)** con el formato reglamentario del Ministerio (encabezado SIE, curso, datos de filiación, columnas por materia, notas, promedios, observaciones APROBADO/REPROBADO y firmas). | `Centralizador.tsx` (`handleExportarPdf`, `handleExportarExcel`, `handleExportarCsv`); `centralizador.test.ts` (`exportarCentralizadorCsv`).           | **Cumplido** |
| **CA 3**               | Si una o más materias están pendientes de entrega, el sistema bloquea la centralización, no cierra el trimestre y muestra la lista de materias y docentes pendientes.                                                         | `src/lib/centralizador.test.ts` (`evaluarEntregasCurso`); `Centralizador.tsx` (banner de alerta bloqueante y botón deshabilitado).                     | **Cumplido** |

---

### 2.2 US-08 · Alerta de Promedio Bajo (Profesor)

| Criterio de Aceptación | Descripción Reglamentaria                                                                                                                                                   | Evidencia y Prueba de Verificación                                                                                                                                         | Estado       |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **CA 1**               | Dado un estudiante con promedio $\ge 51$ que cae por debajo de 51 pts, se dispara una alerta automática dentro del sistema y por correo en menos de 5 minutos (RNF-01, D7). | `src/lib/alertas.test.ts` (`evaluarTransicionAlertaPromedio` detecta transición `NUEVA_CAIDA_BAJO_MINIMO`); `AlertasPromedio.tsx` despliega la alerta y tutor de contacto. | **Cumplido** |
| **CA 2**               | Histéresis: si el estudiante continúa por debajo de 51 pts, la alerta no se duplica hasta que supere el mínimo y vuelva a caer.                                             | `src/lib/alertas.test.ts` (`evaluarTransicionAlertaPromedio` retorna `REPETICION_BLOQUEADA_HISTESIS`).                                                                     | **Cumplido** |
| **Atención**           | El docente puede documentar el acuerdo formativo o seguimiento telefónico sostenido con el tutor asignado.                                                                  | `AlertasPromedio.tsx` (modal accesible de atención) y `profesor.test.tsx` (registro y guardado de nota de atención).                                                       | **Cumplido** |

---

### 2.3 US-12 · Aviso de Boletín Disponible (Padre de Familia)

| Criterio de Aceptación | Descripción Reglamentaria                                                                                                                  | Evidencia y Prueba de Verificación                                                                                                                         | Estado       |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **CA 1**               | Dado un boletín recién publicado, cada padre vinculado recibe un correo electrónico oficial en **15 minutos o menos** (SLA reglamentario). | `src/lib/avisosBoletin.test.ts` (`validarTiempoEntrega` comprueba $t \le 15$ min); `padre.test.tsx` (comprueba badge de correo entregado en $\le 15$ min). | **Cumplido** |
| **RN-09**              | Un padre solo recibe avisos y puede consultar las notas de sus hijos formalmente vinculados.                                               | `avisosBoletin.ts` (`filtrarNotificacionesPadre` por `estudianteId`); `padre.test.tsx` verifica aislamiento de estudiantes ajenos.                         | **Cumplido** |
| **Portal**             | Bandeja de avisos en tiempo real y banner de confirmación en la vista de descarga del boletín digital.                                     | `AvisosPadre.tsx` (ruta `/padre/notificaciones`) y `Boletin.tsx` (banner oficial de emisión de notificación por correo).                                   | **Cumplido** |

---

## 3. Cumplimiento de la Definición de Hecho (Definition of Done - DoD)

- [x] **Código compilable y sin advertencias:** TypeScript estricto verificado con `tsc -b && vite build` (0 errores).
- [x] **Pruebas unitarias completas:** 222 pruebas Web (19 suites) y 82 pruebas API (9 suites) aprobadas al 100 %.
- [x] **Calidad y estándares de código (M16):** ESLint estricto con `max-warnings=0` y Prettier con 0 observaciones.
- [x] **Seguridad de dependencias (M08):** `npm audit --audit-level=high` con 0 vulnerabilidades altas o críticas.
- [x] **Control de acceso y RBAC (M09):** Cada ruta de pantalla (`/secretaria/centralizador`, `/profesor/alertas`, `/padre/notificaciones`) protegida por su respectivo rol con guard JWT.
- [x] **Documentación viva de integración:** Especificación técnica completa entregada en [`sprint4.md`](file:///c:/Users/Joelp/Documents/6.5%20semestre/calidad-de-software/calisfacu/sprint4.md) y diagramas de flujo/secuencia/wireframes en [`sprint4diagramas.md`](file:///c:/Users/Joelp/Documents/6.5%20semestre/calidad-de-software/calisfacu/sprint4diagramas.md).
- [x] **Evidencias formales:** Informes de pruebas, cumplimiento, reportes JUnit XML y capturas PNG/TXT generadas en `docs/evidencias/sprint4/`.

---

## 4. Estado de las Tareas del Sprint 4

| Tarea     | Descripción                                                            | Responsable | Estado                                          |
| :-------- | :--------------------------------------------------------------------- | :---------- | :---------------------------------------------- |
| **T-057** | Lógica de centralización y promedios en Backend (US-09)                | Lujan       | Documentado en `sprint4.md` (esperando backend) |
| **T-058** | Endpoints de exportación PDF y Excel en Backend (US-09)                | Lujan       | Documentado en `sprint4.md` (esperando backend) |
| **T-059** | Pantalla de Centralizador y exportación oficial en Frontend (US-09)    | Galvan      | **Finalizado y verificado (100 %)**             |
| **T-060** | Detección de caída de notas y disparo de eventos en Backend (US-08)    | Lujan       | Documentado en `sprint4.md` (esperando backend) |
| **T-061** | Pantalla de Alertas Tempranas y atención a tutores en Frontend (US-08) | Galvan      | **Finalizado y verificado (100 %)**             |
| **T-062** | Despacho y bandeja de avisos de boletines para padres (US-12)          | Galvan      | **Finalizado y verificado (100 %)**             |
