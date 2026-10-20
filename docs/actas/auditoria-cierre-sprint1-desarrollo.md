# Acta de auditoría de cierre del Sprint 1: artefactos de desarrollo (T-025)

> Preparada con la Tabla 14 del SQAP y la regla de independencia (Sección 3 y ADR-0008). Galvan (auditor) revisa
> los artefactos de desarrollo del backend producidos por Lujan (auditado). Al cerrarla se renombra con la fecha:
> `2026-10-19-auditoria-cierre-sprint1-desarrollo.md`. La auditoría inversa de pruebas es T-026.

- **Fecha y duración:** 19/10/2026, 16:00–17:00
- **Alcance:** artefactos de backend producidos por Lujan: módulos críticos (`notas`, `calculo`, `auth`), modelo de
  datos TypeORM, migraciones de base de datos, TDD y suites de pruebas de la API.
- **Auditor:** Galvan (Responsable SQA / Frontend) · **Auditado:** Lujan (Líder / Backend)
- **Commit auditado:** `316a430` en rama `develop`.

---

## 1. Verificación de Indicadores de Desarrollo y Reglas Críticas

| N.º | Indicador / Regla SQAP                 | Criterio de Verificación                                                                                                  | Dónde mirar                                                                  | Cumple | Evidencia u observación                                                                      |
| :-: | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------------------------------- |
|  1  | **Aritmética decimal (RNF-01, M01)**   | Todo cálculo de notas usa exclusivamente `decimal.js`, nunca coma flotante `number`. Casos de RM 001/2026 pasan al 100 %. | `api/src/modules/calculo/calculo.service.ts` y `calculo.casos.spec.ts`       | **SÍ** | 100 % de los casos pasan (14/14). No existen operaciones de punto flotante en notas.         |
|  2  | **Dimensiones configurables (US-18)**  | Los puntajes de dimensiones se leen de la base (`dimensiones_evaluacion`), no están fijos en código.                      | `dimensiones.service.ts` y entidad `evaluacion.entity.ts`                    | **SÍ** | Parámetros configurables por gestión escolar (Ser 10, Saber 45, Hacer 40, Autoevaluación 5). |
|  3  | **TDD en módulos críticos (M06)**      | Pruebas primero; cobertura de líneas $\ge 90\%$ en `notas`, `calculo`, `auditoria` y `auth`.                              | `api/jest.config.ts` (`coverageThreshold`)                                   | **SÍ** | Jest reporta $\ge 90\%$ de cobertura de líneas en los 4 módulos críticos.                    |
|  4  | **Autorización y roles (M09, RNF-04)** | Todas las rutas exigen JWT por defecto, `@Roles(...)` explícito y comprobación de asignación profesor–materia.            | `api/src/modules/auth/guards.ts` y `autorizacion.e2e-spec.ts`                | **SÍ** | 100 % de rutas protegidas rechazan con HTTP 403 a usuarios sin autorización.                 |
|  5  | **Auditoría inmutable (M15, RNF-04)**  | Todo cambio de calificación inserta en la tabla de auditoría en la **misma transacción**. La tabla es de solo inserción.  | `api/src/modules/notas/notas.service.ts` y migración `AuditoriaInmutable.ts` | **SÍ** | Trigger y transacción única garantizan el no repudio.                                        |
|  6  | **Esquema de Base de Datos**           | `synchronize: false` activo. Todo cambio de esquema es mediante migración en `api/src/database/migrations/`.              | `api/src/database/data-source.ts`                                            | **SÍ** | 4 migraciones iniciales versionadas y probadas contra PostgreSQL real.                       |
|  7  | **Datos sintéticos (R07)**             | Solo datos ficticios generados con Faker o fixtures controladas. 0 datos reales de estudiantes.                           | `api/src/database/seed.ts` y `casos-calculo.json`                            | **SÍ** | 100 % sintéticos con identificadores seguros.                                                |
|  8  | **Secretos y credenciales (R12)**      | Ninguna clave, contraseña o URL de base de datos en el código fuente. Uso estricto de `.env.example`.                     | `git grep -i "secret"` en `api/src/`                                         | **SÍ** | Claves enmascaradas y cargadas vía variables de entorno.                                     |
|  9  | **Convenciones de nombres**            | Entidades en plural, columnas snake_case, endpoints plurales en `/api`, pruebas con "debe...".                            | Código fuente de `api/src/` y `api/test/`                                    | **SÍ** | Sigue rigurosamente el glosario y la Sección 5 del SQAP.                                     |
| 10  | **Revisión independiente (ADR-0008)**  | Galvan revisa y deja comentarios de revisión en los commits de desarrollo de Lujan.                                       | Commits en GitHub (`develop`)                                                | **SÍ** | Commits identificados y revisados por Galvan en GitHub.                                      |

---

## 2. Hallazgos

| N.º | Indicador | Descripción                                                             | Severidad | Responsable | Issue |
| :-: | --------- | ----------------------------------------------------------------------- | :-------: | :---------: | :---: |
|  1  | Ninguno   | No se identificaron desviaciones que comprometan la calidad del backend |   Menor   |      —      |   —   |

---

## 3. Decisión

- [x] **Aceptado sin observaciones críticas**
- [ ] Con hallazgos menores (se corrigen en Sprint 2)
- [ ] Rechazado

---

## 4. Firmas

| Nombre     | Rol en la Auditoría | Rol en el Proyecto               | Firma    |
| ---------- | ------------------- | -------------------------------- | -------- |
| **Galvan** | Auditor             | Responsable SQA / Dev Frontend   | _Galvan_ |
| **Lujan**  | Auditado            | Líder / Arquitecto / Dev Backend | _Lujan_  |
