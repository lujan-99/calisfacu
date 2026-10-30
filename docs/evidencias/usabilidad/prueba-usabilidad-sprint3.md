# Prueba de usabilidad del Sprint 3 (T-054)

> SQAP, Tabla 9 (M11 y M12) y `docs/desarrollo/pruebas.md`. Mide si un profesor que nunca usó CalisFacu registra las
> notas de una actividad sin ayuda (M11) y qué tan usable le resulta el sistema (M12, cuestionario SUS).
>
> **Estado al 30/10/2026: preparada, sin realizar.** Necesita 5 profesores reales que nunca usaron el sistema; no se
> puede simular. Se completa este documento durante la sesión y se guarda al lado el escaneo de los cuestionarios.

- **Fecha:** \_\_\_\_/\_\_\_\_/2026 · **Lugar:** \_\_\_\_\_\_\_\_\_\_\_\_ · **Moderador:** \_\_\_\_\_\_\_\_\_\_\_\_
- **Ambiente:** staging (https://calisfacu-web-staging.onrender.com), build de Jenkins N.º \_\_\_\_, commit \_\_\_\_\_\_\_
- **Usuario de cada participante:** `profesor@calisfacu.test` (seed sintético; contraseña `Calis2026!`). Antes de cada
  sesión se crea una actividad nueva sin notas en Matemática, 1.er trimestre, para que la tarea sea la misma.

## Umbrales

| Métrica | Qué mide                                                                   | Umbral          |
| ------- | -------------------------------------------------------------------------- | --------------- |
| M11     | Profesores que registran las notas de una actividad sin ayuda / profesores | ≥ 80 % (4 de 5) |
| M12     | Puntaje SUS promedio de los mismos 5 profesores (0 a 100)                  | ≥ 68            |

## Guion de la sesión (20 minutos por participante)

1. Leer al participante: "Probamos el sistema, no a usted. Piense en voz alta. No podemos ayudarle durante la tarea".
2. El participante inicia sesión. El moderador no explica la pantalla.
3. **Tarea M11:** "Registre las notas de la actividad «Prueba de usabilidad» de Matemática para todos los estudiantes
   del curso. Use notas entre 1 y 100 que usted elija". Hay éxito si las guarda sin ayuda en 10 minutos o menos.
4. Tareas de observación (no cuentan para M11; se anotan los problemas):
   - Abrir el panel de riesgo de Matemática y decir qué estudiantes están en riesgo y por qué (US-06).
   - Descargar el boletín en PDF de un estudiante (US-07).
5. El participante llena el cuestionario SUS en papel, sin el moderador al lado.

## Cuestionario SUS

Escala de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo).

| N.º | Afirmación                                                                      |
| --- | ------------------------------------------------------------------------------- |
| 1   | Creo que me gustaría usar este sistema con frecuencia.                          |
| 2   | Encontré el sistema innecesariamente complejo.                                  |
| 3   | Pensé que el sistema era fácil de usar.                                         |
| 4   | Creo que necesitaría ayuda de una persona técnica para poder usar este sistema. |
| 5   | Encontré que las funciones del sistema estaban bien integradas.                 |
| 6   | Pensé que había demasiada inconsistencia en el sistema.                         |
| 7   | Imagino que la mayoría de las personas aprenderían a usar este sistema rápido.  |
| 8   | Encontré el sistema muy incómodo de usar.                                       |
| 9   | Me sentí muy seguro usando el sistema.                                          |
| 10  | Necesité aprender muchas cosas antes de poder usar este sistema.                |

**Puntaje:** en los ítems impares se resta 1 a la respuesta; en los pares, la respuesta se resta de 5. Se suman los
diez valores y se multiplica por 2,5.

## Resultados

| Participante | Años de docencia | Tarea M11 sin ayuda | Tiempo (min) | Puntaje SUS | Problemas observados |
| ------------ | ---------------- | ------------------- | ------------ | ----------- | -------------------- |
| P1           |                  | ☐ Sí ☐ No           |              |             |                      |
| P2           |                  | ☐ Sí ☐ No           |              |             |                      |
| P3           |                  | ☐ Sí ☐ No           |              |             |                      |
| P4           |                  | ☐ Sí ☐ No           |              |             |                      |
| P5           |                  | ☐ Sí ☐ No           |              |             |                      |

- **M11:** \_\_\_ de 5 (\_\_\_ %) · ☐ Cumple ☐ No cumple
- **M12:** promedio SUS \_\_\_\_ · ☐ Cumple ☐ No cumple

## Problemas encontrados

Cada problema que se repite en dos o más participantes se registra como issue para el Sprint 4.

| N.º | Problema | Participantes | Severidad | Issue |
| --- | -------- | ------------- | --------- | ----- |
| 1   |          |               |           |       |

## Firmas

| Nombre | Rol       | Firma |
| ------ | --------- | ----- |
|        | Moderador |       |
| Lujan  | Líder     |       |
