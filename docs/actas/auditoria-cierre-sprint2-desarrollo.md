# Acta de auditoría de cierre del Sprint 2: artefactos de desarrollo (T-041)

> Preparada con la Tabla 14 del SQAP y la regla de independencia (Sección 3 y ADR-0008). Galvan (auditor) revisa
> los artefactos de desarrollo y diseño producidos para el Sprint 2 por Lujan (auditado).
> La auditoría inversa de evidencias de prueba es T-042.

- **Fecha y duración:** 20/10/2026, 17:00–18:00
- **Alcance:** artefactos y módulos del Sprint 2: US-04 (Corrección auditable), US-03 (Historial académico),
  US-19 (Registro de asistencia), US-05 (Importación desde Excel) y US-10 (Control de entrega de notas).
- **Auditor:** Galvan (Responsable SQA / Frontend) · **Auditado:** Lujan (Líder / Backend)
- **Rama auditada:** `develop`.

---

## 1. Verificación de Indicadores de Desarrollo y Reglas Críticas

| N.º | Indicador / Regla SQAP                        | Criterio de Verificación                                                                                                      | Dónde mirar                                            | Cumple | Evidencia u observación                                                             |
| :-: | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :----: | :---------------------------------------------------------------------------------- |
|  1  | **Corrección auditable (US-04, RNF-04, M15)** | Exige motivo obligatorio; guarda usuario, fecha/hora, valor anterior y nuevo en bitácora inmutable de solo inserción.         | `api/src/modules/auditoria/` y `AuditoriaInmutable.ts` | **SÍ** | Transacción atómica y trigger de solo inserción garantizan no repudio.              |
|  2  | **Historial académico (US-03, M09)**          | Consulta cronológica por trimestres con control de acceso: si el profesor no imparte clases al estudiante, responde HTTP 403. | `api/src/modules/notas/acceso.service.ts`              | **SÍ** | Control de autorización por asignación docente verificado.                          |
|  3  | **Registro de asistencia (US-19, D5)**        | Porcentaje ministerial = (presentes + licencias) / clases × 100. Bloqueo estricto de fechas futuras.                          | `api/src/modules/asistencia/`                          | **SÍ** | Regla D5 y validación de fecha según huso horario de Bolivia.                       |
|  4  | **Importación desde Excel (US-05)**           | Validación exhaustiva por fila, segregación de válidas vs observadas con motivo y auditoría con origen "IMPORTACIÓN".         | `src/lib/importacionExcel.ts` y contratos API          | **SÍ** | Formatos CSV/XLSX validados; notas inválidas o estudiantes inexistentes rechazados. |
|  5  | **Control de entrega de notas (US-10)**       | La secretaria monitorea materias entregadas vs pendientes. Validación: solo se entrega si el 100 % de estudiantes tiene nota. | `src/lib/controlEntregas.ts` y contratos API           | **SÍ** | Regla de entrega completa implementada y probada.                                   |
|  6  | **TDD en módulos críticos (M06)**             | Pruebas primero; cobertura $\ge 90\%$ en `notas`, `calculo`, `auditoria` y `auth`.                                            | `api/jest.config.ts`                                   | **SÍ** | Umbrales de Jest vigentes y superados.                                              |
|  7  | **Esquema de Base de Datos**                  | `synchronize: false` permanente. Todo cambio es migración versionada.                                                         | `api/src/database/migrations/`                         | **SÍ** | Esquema íntegro y reproducible con PostgreSQL real.                                 |
|  8  | **Preservación en burbuja de unidades**       | Modificaciones de nombres o datos de unidad educativa no disparan cascadas sobre cursos o estudiantes.                        | Lógica de secretaría y servicios de base               | **SÍ** | Operaciones de actualización aisladas de dependencias jerárquicas.                  |
|  9  | **Datos sintéticos (R07)**                    | Solo datos ficticios generados sintéticamente. Cero datos reales de menores de edad.                                          | `seed.ts` y fixtures de prueba                         | **SÍ** | 100 % sintéticos con códigos RUDE y CI simulados.                                   |
| 10  | **Revisión independiente (ADR-0008)**         | Revisión cruzada de commits en `develop`.                                                                                     | Commits en GitHub (`develop`)                          | **SÍ** | Cumplimiento del principio de 4 ojos (Lujan / Galvan).                              |

---

## 2. Hallazgos

| N.º | Indicador | Descripción                                                             | Severidad | Responsable | Issue |
| :-: | :-------- | :---------------------------------------------------------------------- | :-------: | :---------: | :---: |
|  1  | Ninguno   | Todos los artefactos cumplen las especificaciones y contratos técnicos. |   Menor   |      —      |   —   |

---

## 3. Decisión

- [x] **Aceptado sin observaciones críticas**
- [ ] Con hallazgos menores (se corrigen en Sprint 3)
- [ ] Rechazado

---

## 4. Firmas

| Nombre     | Rol en la Auditoría | Rol en el Proyecto               | Firma    |
| :--------- | :------------------ | :------------------------------- | :------- |
| **Galvan** | Auditor             | Responsable SQA / Dev Frontend   | _Galvan_ |
| **Lujan**  | Auditado            | Líder / Arquitecto / Dev Backend | _Lujan_  |
