# Acta de inspección Fagan: SAD (T-003)

> Preparada antes de la reunión con la plantilla de esta carpeta y las Tablas 11 a 13 del SQAP. El moderador la completa
> durante la inspección y, al cerrarla, la renombra con la fecha: `AAAA-MM-DD-inspeccion-fagan-sad.md`.

- **Fecha y duración:** \_\_\_\_/\_\_\_\_/2026, \_\_\_\_:\_\_\_\_–\_\_\_\_:\_\_\_\_ (reunión de 2 h como máximo)
- **Artefacto y versión:** SAD 1.1 (`docs/sad/SAD-CalisFacu.pdf`, 5 páginas) y ADR 0001 a 0009 (`docs/adr/`)
- **Participantes y rol (SQAP, Tabla 12):**

| Rol                 | Nombre                        |
| ------------------- | ----------------------------- |
| Moderador y escriba | Galvan                        |
| Autor (responde)    | Lujan                         |
| Lector e inspector  | \[integrante de otro equipo\] |
| Inspector           | Galvan                        |

## Criterios de entrada (los verifica el moderador en la planificación)

- [ ] El SAD 1.1 está en el repositorio, en Markdown y en PDF, y las dos versiones dicen lo mismo.
- [ ] El inspector externo recibió el PDF, los ADR y esta lista al menos un día antes.
- [ ] El modelo de datos del SAD coincide con las migraciones (`api/test/esquema.e2e-spec.ts` pasa en el último build).

## Métricas (SQAP, Sección 6.1)

| Inspector | Páginas | Tiempo de preparación | Ritmo (páginas/hora, objetivo ≤ 10) | Defectos encontrados |
| --------- | ------- | --------------------- | ----------------------------------- | -------------------- |
|           | 5       |                       |                                     |                      |
|           | 5       |                       |                                     |                      |

Densidad de defectos (defectos/página): \_\_\_ · Defectos mayores: \_\_\_ · menores: \_\_\_

## Lista de verificación (SQAP, Tabla 11, inspección del SAD)

| N.º | Punto                                                                                                       | Cumple | Evidencia u observación |
| --- | ----------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| 1   | Modelo de datos normalizado, con índices para las consultas de notas y boletines (Sección 5 del SAD)        |        |                         |
| 2   | Los módulos críticos (`auth`, `notas`, `calculo`, `auditoria`) están aislados y sin dependencias circulares |        |                         |
| 3   | El cálculo usa aritmética decimal y lee los puntajes de la base, no fijos en el código (ADR-0004)           |        |                         |
| 4   | Toda ruta exige JWT y declara roles; la asignación profesor–materia se comprueba en el servicio             |        |                         |
| 5   | La auditoría es de solo inserción y se escribe en la misma transacción que la nota (ADR-0005)               |        |                         |
| 6   | La generación de boletines de cursos grandes va por una cola (ADR-0006, RNF-03)                             |        |                         |
| 7   | Respaldos diarios cifrados y restauración probada (RNF-07, `.github/workflows/backup.yml`)                  |        |                         |
| 8   | Secretos fuera del código: variables de entorno, Jenkins Credentials y panel de Render                      |        |                         |
| 9   | Ambientes y despliegue coherentes con ADR-0008 y ADR-0009 (develop → staging en Render)                     |        |                         |
| 10  | Cada RNF tiene en la Sección 8 del SAD el mecanismo que lo cubre                                            |        |                         |

## Hallazgos

| N.º | Ubicación | Descripción | Severidad (mayor/menor) | Responsable | Issue |
| --- | --------- | ----------- | ----------------------- | ----------- | ----- |
| 1   |           |             |                         | Lujan       |       |
| 2   |           |             |                         | Lujan       |       |
| 3   |           |             |                         | Lujan       |       |

## Decisión

- [ ] Aceptado · [ ] Aceptado con cambios · [ ] Rechazado
- Retrabajo del autor: hasta \_\_\_\_/\_\_\_\_/2026 (1 día hábil). Seguimiento del moderador: \_\_\_\_/\_\_\_\_/2026.
- Criterio de salida: 0 defectos mayores abiertos.

## Firmas

| Nombre | Rol                 | Firma |
| ------ | ------------------- | ----- |
| Galvan | Moderador y escriba |       |
| Lujan  | Autor               |       |
|        | Lector e inspector  |       |
