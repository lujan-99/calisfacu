# Acta de revisión del Sprint 3 (demo con el cliente)

> Preparada con la Tabla 11 del SQAP (revisión del sprint). Se completa durante la demo y, al cerrarla, se renombra con
> la fecha: `AAAA-MM-DD-revision-sprint3.md`. Una historia se acepta solo si todos sus criterios del sprint se ven
> funcionando en staging; las tareas aceptadas pasan de "En revisión" a "Hecho" en el backlog.
>
> **Estado al 30/10/2026: pendiente.** El incremento está en `develop` con todas las pruebas en verde en local
> (`docs/evidencias/sprint3/informe-pruebas-sprint3.md`); falta la demo con el cliente.

- **Fecha y duración:** \_\_\_\_/\_\_\_\_/2026, \_\_\_\_:\_\_\_\_–\_\_\_\_:\_\_\_\_
- **Incremento:** staging en Render, commit \_\_\_\_\_\_\_ (`GET /api/salud`), build de Jenkins N.º \_\_\_\_ en SUCCESS
- **Participantes:** cliente (profesor, secretaria y un padre de familia): \_\_\_\_\_\_\_\_\_\_\_\_ · Lujan · Galvan

## Preparación (30 minutos antes)

1. Aplicar en Render el servicio Redis nuevo de `render.yaml` (`calisfacu-redis-staging`): Render → Blueprint →
   sincronizar. Sin Redis, la cola de boletines de un curso no procesa trabajos (el boletín individual sí funciona).
2. Despertar staging: abrir https://calisfacu-api-staging.onrender.com/api/salud y esperar `"estado": "ok"`.
3. Abrir https://calisfacu-web-staging.onrender.com en tres ventanas privadas: profesor, secretaria y padre.
4. Dejar al menos un curso con las notas de un trimestre entregadas por todas sus materias (US-10), para poder
   publicar el boletín en la demo.

Usuarios sintéticos del seed (contraseña `Calis2026!`): `profesor@`, `secretaria@`, `admin@` y `padre@calisfacu.test`.

## Guion

| N.º | Qué se muestra                                                                                                 | Dónde | Historia y criterio  |
| --- | -------------------------------------------------------------------------------------------------------------- | ----- | -------------------- |
| 1   | Panel de riesgo de una materia: cada estudiante con su nota del trimestre y su porcentaje de asistencia        | Web   | US-06 CA 1, D18      |
| 2   | Los estudiantes con promedio menor que 51 o asistencia menor que el umbral aparecen "en riesgo", con el motivo | Web   | US-06 CA 2, D6       |
| 3   | El administrador cambia el umbral de asistencia de la gestión y el panel lo refleja                            | API   | US-06 CA 2, D6       |
| 4   | El profesor descarga el boletín en PDF de un estudiante: unidad educativa, SIE, nivel, año, paralelo y notas   | Web   | US-07 CA 1, D19      |
| 5   | Las notas y la asistencia del PDF son las mismas que muestra el historial del estudiante                       | Web   | US-07 CA 1           |
| 6   | "Generar todos los boletines": la cola avisa al terminar y entrega un PDF con una página por estudiante        | Web   | US-07 CA 3, ADR-0006 |
| 7   | La secretaria vincula un padre con un estudiante, con su parentesco                                            | Web   | US-20 CA 1, D17      |
| 8   | El padre ve solo a sus hijos vinculados; si cambia el ID en la URL de la API recibe 403                        | Web   | US-20 CA 1 y 2       |
| 9   | Con el boletín sin publicar, el padre ve "en elaboración" y ninguna nota                                       | Web   | US-11 CA 2, D20      |
| 10  | La secretaria no puede publicar mientras falte una entrega; con todas, publica el trimestre                    | Web   | US-11, D20           |
| 11  | El padre ve las notas del trimestre publicado y descarga el PDF                                                | Web   | US-11 CA 1           |

El criterio 2 de US-07 (p95 ≤ 2000 ms con 100 usuarios durante 10 minutos) no se muestra en la demo: se mide con JMeter
(T-052) y su resultado está en el informe de pruebas.

## Resultado por historia

| Historia                           | Criterios vistos | Aceptada  | Cambios que pide el cliente |
| ---------------------------------- | ---------------- | --------- | --------------------------- |
| US-06 Panel de riesgo académico    |                  | ☐ Sí ☐ No |                             |
| US-07 Boletín de notas en PDF      |                  | ☐ Sí ☐ No |                             |
| US-20 Vinculación padre–estudiante |                  | ☐ Sí ☐ No |                             |
| US-11 Consulta de boletín          |                  | ☐ Sí ☐ No |                             |

Las decisiones D17 a D20 (`docs/backlog/reglas-ministerio.md`) se tomaron sin el cliente. Hay que mostrárselas y anotar
si las acepta o pide otra regla, en especial:

- **D20:** el boletín lo publica la secretaria por curso y trimestre, y solo cuando todos los profesores entregaron
  sus notas. La historia dice "el profesor aún no publicó"; se interpretó como la entrega de cada profesor.
- **D18:** el "promedio actual" del panel es la nota del trimestre de esa materia y la asistencia es la acumulada de
  la gestión.
- **D17:** un padre que pide un estudiante que no existe recibe 403 y no 404, para no revelar qué estudiantes hay.

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
