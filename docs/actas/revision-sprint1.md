# Acta de revisión del Sprint 1 (demo con el cliente)

> Preparada con la Tabla 11 del SQAP (revisión del sprint, día 5). Se completa durante la demo y, al cerrarla, se
> renombra con la fecha: `AAAA-MM-DD-revision-sprint1.md`. Una historia se acepta solo si todos sus criterios del
> sprint se ven funcionando en staging; las tareas aceptadas pasan de "En revisión" a "Hecho" en el backlog.

- **Fecha y duración:** 19/10/2026, 15:00–16:00
- **Incremento:** staging en Render, commit `316a430` (`GET /api/salud`), build de Jenkins N.º 12 en SUCCESS
- **Participantes:** cliente (profesor y secretaria): Profr. Ramiro / Lic. Ana · Lujan · Galvan

## Preparación (30 minutos antes)

1. Despertar staging: abrir https://calisfacu-api-staging.onrender.com/api/salud y esperar `"estado": "ok"` (el plan
   gratuito tarda hasta un minuto en despertar). Confirmar que `version` es el commit del último build verde.
2. Abrir https://calisfacu-web-staging.onrender.com en una ventana privada.
3. Probar `node scripts/demo-sprint1.mjs` **sin el paso 6** antes de la reunión, o correrlo completo solo una vez: el
   paso 6 deja bloqueada 15 minutos la cuenta `profesor2@calisfacu.test`.
4. Tener impresa el acta de conformidad de las reglas de cálculo (`conformidad-reglas-calculo.pdf`, T-004).

Usuarios sintéticos del seed (contraseña `Calis2026!`): `profesor@`, `profesor2@`, `secretaria@`, `admin@` y
`padre@calisfacu.test`.

## Guion

| N.º | Qué se muestra                                                                                 | Dónde                         | Historia y criterio       | Quién  |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------- | ------ |
| 1   | Inicio de sesión del profesor; entra a la planilla                                             | Web                           | US-17 CA 1                | Galvan |
| 2   | Menú según el rol (profesor, secretaria)                                                       | Web                           | US-17 CA 1 (T-012)        | Galvan |
| 3   | Registrar las notas de una actividad y guardar la planilla completa                            | Web                           | US-01 CA 1 y 3            | Galvan |
| 4   | Una nota de 120 (o 0) se rechaza junto al campo y no se guarda nada                            | Web                           | US-01 CA 2 (D1)           | Galvan |
| 5   | La nota trimestral y el estado aprueba / reprueba en la planilla                               | Web                           | US-02 (T-024)             | Galvan |
| 6   | La secretaria no puede registrar notas: HTTP 403                                               | `demo-sprint1.mjs`, paso 1    | US-17 CA 2                | Lujan  |
| 7   | Dimensiones 2026 (Ser 10, Saber 45, Hacer 40, Autoevaluación 5); si no suman 100 se rechazan   | `demo-sprint1.mjs`, pasos 2–3 | US-18 CA 6                | Lujan  |
| 8   | Con notas registradas, los puntajes ya no se pueden cambiar                                    | `demo-sprint1.mjs`, paso 4    | US-18 CA 7                | Lujan  |
| 9   | Nota trimestral calculada por estudiante, con "pendiente" si falta una dimensión               | `demo-sprint1.mjs`, paso 5    | US-02 CA 1–3 y 6          | Lujan  |
| 10  | Tabla de casos: el cliente la revisa y la firma; las pruebas automáticas usan los mismos casos | Acta impresa y Jenkins        | US-02 CA 5 (T-004)        | Lujan  |
| 11  | Cinco contraseñas incorrectas bloquean la cuenta 15 minutos                                    | `demo-sprint1.mjs`, paso 6    | US-17 CA 3                | Lujan  |
| 12  | La secretaria registra un curso y le asigna materias y estudiantes                             | Web                           | US-18 CA 1 (T-016, T-017) | Galvan |
| 13  | Pipeline: un push a develop pasa por pruebas, despliegue, smoke test y E2E sin intervención    | Jenkins (Stage View)          | T-007, T-028, T-029       | Galvan |

Los criterios que solo se verifican con pruebas automáticas (US-17 CA 4, expiración de la sesión a los 30 minutos;
US-18 CA 2 a 5; US-02 CA 4, nota anual) se muestran con el informe de pruebas del build en Jenkins. US-01 CA 4 (carga
con JMeter) es del Sprint 4 (M04).

## Resultado por historia

| Historia                        | Criterios vistos | Aceptada  | Cambios que pide el cliente |
| ------------------------------- | ---------------- | --------- | --------------------------- |
| US-17 Autenticación y roles     |                  | ☐ Sí ☐ No |                             |
| US-18 Gestión académica base    |                  | ☐ Sí ☐ No |                             |
| US-01 Registro central de notas |                  | ☐ Sí ☐ No |                             |
| US-02 Cálculo automático        |                  | ☐ Sí ☐ No |                             |

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
| Galvan | Responsable SQA      |       |
