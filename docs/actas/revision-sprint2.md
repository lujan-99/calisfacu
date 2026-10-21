# Acta de revisión del Sprint 2 (demo con el cliente)

> Preparada con la Tabla 11 del SQAP (revisión del sprint). Se completa durante la demo y, al cerrarla, se renombra con
> la fecha: `AAAA-MM-DD-revision-sprint2.md`. Una historia se acepta solo si todos sus criterios del sprint se ven
> funcionando en staging; las tareas aceptadas pasan de "En revisión" a "Hecho" en el backlog.
>
> **Estado al 21/10/2026: pendiente.** La versión anterior de esta acta daba la demo por hecha el 20/10/2026, con las
> historias aceptadas y firmadas, pero esa demo no se realizó. Galvan ya no participa en el proyecto, así que la
> conduce Lujan.

- **Fecha y duración:** \_\_\_\_/\_\_\_\_/2026, \_\_\_\_:\_\_\_\_–\_\_\_\_:\_\_\_\_
- **Incremento:** staging en Render, commit \_\_\_\_\_\_\_ (`GET /api/salud`), build de Jenkins N.º \_\_\_\_ en SUCCESS
  (el último verde al preparar el acta: N.º 25, commit `6216e1b`)
- **Participantes:** cliente (profesor y secretaria): \_\_\_\_\_\_\_\_\_\_\_\_ · Lujan

## Preparación (30 minutos antes)

1. Despertar staging: abrir https://calisfacu-api-staging.onrender.com/api/salud y esperar `"estado": "ok"`. Confirmar
   que `version` es el commit del último build verde.
2. Abrir https://calisfacu-web-staging.onrender.com en dos ventanas privadas: una para el profesor y otra para el
   administrador o la secretaria.
3. Descargar desde la pantalla de importación la plantilla de una actividad sin notas y llenarla con algunas notas
   válidas, una de 120 y un RUDE que no existe.

Usuarios sintéticos del seed (contraseña `Calis2026!`): `profesor@`, `secretaria@`, `admin@` y `padre@calisfacu.test`.

## Guion

| N.º | Qué se muestra                                                                                              | Dónde   | Historia y criterio |
| --- | ----------------------------------------------------------------------------------------------------------- | ------- | ------------------- |
| 1   | El profesor pide la edición de una nota registrada; el administrador la aprueba en "Solicitudes de edición" | Web     | US-04, D16          |
| 2   | El profesor corrige la nota: sin motivo no se guarda; con motivo, se guarda                                 | Web     | US-04 CA 1          |
| 3   | El historial de la nota muestra quién, cuándo, valor anterior y nuevo; no hay forma de editarlo ni borrarlo | Web     | US-04 CA 1 y 2      |
| 4   | La nota trimestral del estudiante cambia en cuanto se corrige                                               | Web     | US-04 CA 3          |
| 5   | Historial del estudiante: trimestres en orden, notas por materia y dimensión, promedio, tendencia           | Web     | US-03 CA 1, D12     |
| 6   | Un profesor que no da clases al estudiante recibe "acceso denegado"                                         | Web     | US-03 CA 2          |
| 7   | Importar la planilla: vista previa con filas válidas y con error, cada una con su motivo                    | Web     | US-05 CA 1 y 2, D14 |
| 8   | Confirmar la importación; en el historial de una nota importada aparece "Importación desde Excel"           | Web     | US-05 CA 3          |
| 9   | Tomar asistencia de la clase (presente, ausente, licencia) y ver el porcentaje                              | Web     | US-19 CA 1 y 2, D5  |
| 10  | Una fecha futura queda bloqueada                                                                            | Web     | US-19 CA 3, D8      |
| 11  | La secretaria ve por curso qué materias están entregadas o pendientes                                       | Web     | US-10 CA 1          |
| 12  | El profesor no puede entregar con notas faltantes; con todas las notas, sí                                  | Web     | US-10 CA 2, D13     |
| 13  | La secretaria registra el CI (opcional) de un estudiante                                                    | Web     | US-18, D15          |
| 14  | Pipeline: un push a develop pasa por pruebas, despliegue, smoke test y E2E sin intervención                 | Jenkins | T-028, T-029        |

## Resultado por historia

| Historia                          | Criterios vistos | Aceptada  | Cambios que pide el cliente |
| --------------------------------- | ---------------- | --------- | --------------------------- |
| US-04 Corrección auditable        |                  | ☐ Sí ☐ No |                             |
| US-03 Historial académico         |                  | ☐ Sí ☐ No |                             |
| US-19 Registro de asistencia      |                  | ☐ Sí ☐ No |                             |
| US-05 Importación desde Excel     |                  | ☐ Sí ☐ No |                             |
| US-10 Control de entrega de notas |                  | ☐ Sí ☐ No |                             |

Las decisiones D12 a D16 (`docs/backlog/reglas-ministerio.md`) se tomaron sin el cliente: en la demo se le muestran y
se anota si las acepta o pide otra regla.

## Cambios solicitados

Cada cambio se registra como issue y, si toca una regla del cálculo o un requisito, sigue la solicitud de cambio del
SQAP (Sección 16).

| N.º | Descripción | Historia | Issue | Sprint |
| --- | ----------- | -------- | ----- | ------ |
| 1   |             |          |       |        |

## Firmas

| Nombre | Rol                  | Firma |
| ------ | -------------------- | ----- |
|        | Cliente (profesor)   |       |
|        | Cliente (secretaría) |       |
| Lujan  | Líder                |       |
