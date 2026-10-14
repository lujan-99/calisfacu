# Acta de inspección Fagan: SRS (T-001)

> Preparada antes de la reunión con la plantilla de esta carpeta y las Tablas 11 a 13 del SQAP. El moderador la completa
> durante la inspección y, al cerrarla, la renombra con la fecha: `AAAA-MM-DD-inspeccion-fagan-srs.md`.

- **Fecha y duración:** \_\_\_\_/\_\_\_\_/2026, \_\_\_\_:\_\_\_\_–\_\_\_\_:\_\_\_\_ (reunión de 2 h como máximo)
- **Artefacto y versión:** SRS 1.1 (`docs/srs/SRS-CalisFacu.pdf`, 5 páginas), backlog v2 (`docs/backlog/backlog.md`),
  historias US-01, US-02, US-17 y US-18, y la tabla de casos de cálculo (`docs/actas/conformidad-reglas-calculo.pdf`)
- **Participantes y rol (SQAP, Tabla 12):**

| Rol                   | Nombre                                              |
| --------------------- | --------------------------------------------------- |
| Moderador y escriba   | Galvan                                              |
| Autor (responde)      | Lujan                                               |
| Lector                | \[integrante de otro equipo\]                       |
| Inspector del cliente | \[profesor de la unidad educativa piloto\]          |
| Inspector externo     | \[integrante de otro equipo\] (puede ser el lector) |
| Inspector             | Galvan                                              |

## Criterios de entrada (los verifica el moderador en la planificación)

- [ ] El SRS 1.1 está en el repositorio, en Markdown y en PDF, y las dos versiones dicen lo mismo.
- [ ] Cada inspector recibió el PDF y esta lista de verificación al menos un día antes.
- [ ] La Sección 2.3 del SRS ya no tiene preguntas abiertas (decisiones D1 a D9).
- [ ] La tabla de casos de cálculo está impresa para que el cliente la firme en la misma sesión (T-004).

## Métricas (SQAP, Sección 6.1)

| Inspector | Páginas | Tiempo de preparación | Ritmo (páginas/hora, objetivo ≤ 10) | Defectos encontrados |
| --------- | ------- | --------------------- | ----------------------------------- | -------------------- |
|           | 5       |                       |                                     |                      |
|           | 5       |                       |                                     |                      |
|           | 5       |                       |                                     |                      |

Densidad de defectos (defectos/página): \_\_\_ · Defectos mayores: \_\_\_ · menores: \_\_\_

## Lista de verificación (SQAP, Tabla 11, revisión de requerimientos)

| N.º | Punto                                                                                                     | Cumple | Evidencia u observación |
| --- | --------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| 1   | Cada historia del Sprint 1 (US-01, US-02, US-17, US-18) tiene criterios Dado/Cuando/Entonces verificables |        |                         |
| 2   | Cada criterio indica con qué prueba se verifica (Jest, Supertest, Cypress, JMeter)                        |        |                         |
| 3   | Cada RNF tiene métrica y valor numérico (Sección 4 del SRS y Tabla 9 del SQAP)                            |        |                         |
| 4   | Las reglas de la RM 001/2026 tienen casos de ejemplo con el resultado esperado                            |        |                         |
| 5   | Los términos del dominio están en el glosario (`docs/glosario.md`) y se usan igual en el SRS              |        |                         |
| 6   | No quedan preguntas abiertas (❓); cada decisión D1 a D9 tiene dónde se aplica                            |        |                         |
| 7   | Los datos de menores de edad están protegidos: acceso por rol y por vínculo (RNF-04)                      |        |                         |
| 8   | El alcance de la v1.0 excluye el módulo de pagos (US-13 a US-16) de forma explícita                       |        |                         |

## Hallazgos

| N.º | Ubicación | Descripción | Severidad (mayor/menor) | Responsable | Issue |
| --- | --------- | ----------- | ----------------------- | ----------- | ----- |
| 1   |           |             |                         | Lujan       |       |
| 2   |           |             |                         | Lujan       |       |
| 3   |           |             |                         | Lujan       |       |

## Decisión

- [ ] Aceptado · [ ] Aceptado con cambios · [ ] Rechazado
- Retrabajo del autor: hasta \_\_\_\_/\_\_\_\_/2026 (1 día hábil). Seguimiento del moderador: \_\_\_\_/\_\_\_\_/2026.
- Criterio de salida: 0 defectos mayores abiertos y la tabla de casos firmada por el cliente.

## Firmas

| Nombre | Rol                   | Firma |
| ------ | --------------------- | ----- |
| Galvan | Moderador y escriba   |       |
| Lujan  | Autor                 |       |
|        | Inspector del cliente |       |
|        | Lector e inspector    |       |
