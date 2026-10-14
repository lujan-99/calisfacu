# Acta de conformidad de las reglas de cálculo

> Generada con `python3 docs/herramientas/gen_conformidad_calculo.py`. La versión para imprimir y
> firmar es `conformidad-reglas-calculo.pdf`; el acta firmada se escanea y se guarda junto a ella.

- **Proyecto:** CalisFacu v1.0 · Equipo L-001 · COM450 Calidad de Software
- **Cliente:** [Nombre de la unidad educativa piloto]
- **Tarea y riesgo:** T-004 · R02 (cálculo distinto al reglamento) · US-02
- **Reglas:** docs/backlog/reglas-ministerio.md (RM 001/2026, decisiones del 13/10/2026)
- **Pruebas que lo verifican:** calculo.casos.spec.ts y calculo.service.spec.ts, en cada build de Jenkins (M01)
- **Fecha y lugar de la firma:** ____________________

El cliente confirma que CalisFacu calcula la nota trimestral y la nota anual como lo hace la unidad educativa según la RM 001/2026. Cada caso de esta acta es una prueba automática: si el cliente marca un caso o una decisión como "Cambiar", el equipo abre una solicitud de cambio (SQAP, Sección 16), corrige la prueba y el código, y vuelve a presentar el acta.

## 1. Fórmula y puntajes (RM 001/2026)

1. Puntos de una dimensión = promedio de las notas de sus actividades × (puntaje máximo de la dimensión ÷ 100).
2. Nota trimestral = suma de los puntos de las cuatro dimensiones, redondeada al entero solo al final (0,5 hacia arriba).
3. Aprueba si la nota es 51 o más. Escala de cada actividad: 1 a 100.

| Dimensión      | Ser | Saber | Hacer | Autoevaluación | Total |
| -------------- | --- | ----- | ----- | -------------- | ----- |
| Puntaje máximo | 10  | 45    | 40    | 5              | 100   |

## 2. Casos de la nota trimestral

Promedio de cada dimensión (escala 1 a 100), puntos que aporta y nota final.

| N.º | Caso                                       | Ser | Saber | Hacer | Autoev. | Puntos (Ser + Saber + Hacer + Autoev.) | Sin redondear | Nota | Resultado | Conforme  |
| --- | ------------------------------------------ | --- | ----- | ----- | ------- | -------------------------------------- | ------------- | ---- | --------- | --------- |
| 1   | Caso típico                                | 80  | 80    | 80    | 100     | 8 + 36 + 32 + 5                        | 81            | 81   | Aprueba   | ☐ Sí ☐ No |
| 2   | Frontera: 50,5 se redondea a 51 (aprueba)  | 100 | 50    | 40    | 40      | 10 + 22,5 + 16 + 2                     | 50,5          | 51   | Aprueba   | ☐ Sí ☐ No |
| 3   | Frontera: 50,4 se redondea a 50 (reprueba) | 80  | 52    | 40    | 60      | 8 + 23,4 + 16 + 3                      | 50,4          | 50   | Reprueba  | ☐ Sí ☐ No |
| 4   | Todo al máximo                             | 100 | 100   | 100   | 100     | 10 + 45 + 40 + 5                       | 100           | 100  | Aprueba   | ☐ Sí ☐ No |
| 5   | Todo al mínimo de la escala                | 1   | 1     | 1     | 1       | 0,1 + 0,45 + 0,4 + 0,05                | 1             | 1    | Reprueba  | ☐ Sí ☐ No |

## 3. Nota anual y nota pendiente

| N.º | Caso                     | Datos                                                   | Cálculo                    | Nota | Resultado                        | Conforme  |
| --- | ------------------------ | ------------------------------------------------------- | -------------------------- | ---- | -------------------------------- | --------- |
| 6   | Nota anual (D3)          | Trimestres 50, 51, 51                                   | (50 + 51 + 51) ÷ 3 = 50,67 | 51   | Aprueba                          | ☐ Sí ☐ No |
| 7   | Nota anual (D3)          | Trimestres 50, 50, 51                                   | (50 + 50 + 51) ÷ 3 = 50,33 | 50   | Reprueba                         | ☐ Sí ☐ No |
| 8   | Dimensión sin notas (D4) | Ser 80 · Saber 70 · Hacer 80 · Autoevaluación sin notas | No se calcula              | —    | Pendiente (falta Autoevaluación) | ☐ Sí ☐ No |

## 4. Decisiones del equipo

Las tomó el equipo porque el reglamento no las define o el SRS las dejó abiertas. El cliente marca cada una.

| N.º | Pregunta                                           | Decisión                                                                                              | De acuerdo | Cambiar (observación) |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- | --------------------- |
| D1  | ¿Se admite 0 en una actividad no presentada?       | No. La escala es de 1 a 100; una actividad no presentada se registra con 1.                           | ☐          |                       |
| D2  | ¿Cómo se redondea?                                 | Al entero más cercano, 0,5 hacia arriba (ROUND_HALF_UP), solo al final de la suma.                    | ☐          |                       |
| D3  | ¿La nota anual es el promedio de los 3 trimestres? | Sí, redondeado con la regla D2.                                                                       | ☐          |                       |
| D4  | Dimensión sin notas: ¿"pendiente" o 0?             | Pendiente: no hay nota trimestral hasta que las cuatro dimensiones tengan al menos una nota.          | ☐          |                       |
| D5  | ¿Una licencia cuenta como asistencia?              | Sí: porcentaje = (presentes + licencias) / clases dictadas × 100, con un decimal.                     | ☐          |                       |
| D6  | Umbral de asistencia para "en riesgo"              | Menos de 80 %, configurable por gestión. Riesgo = promedio < 51 o asistencia < 80 %.                  | ☐          |                       |
| D7  | Canal de notificación                              | Aviso dentro del sistema y correo electrónico.                                                        | ☐          |                       |
| D8  | ¿Qué es una "fecha futura" en la asistencia?       | Posterior a hoy en Bolivia (America/La_Paz), no a la fecha del servidor (UTC).                        | ☐          |                       |
| D9  | ¿Se puede tomar asistencia a una parte del curso?  | No: cada clase registra a todos los estudiantes del curso, así "clases dictadas" es igual para todos. | ☐          |                       |

## 5. Observaciones del cliente

---

---

## 6. Decisión

- [ ] Conforme: las reglas y los casos quedan aprobados.
- [ ] Conforme con cambios: se abren las solicitudes de cambio anotadas en la Sección 5.
- [ ] No conforme: se corrige y se vuelve a presentar el ****/****/2026.

## 7. Firmas

| Nombre | Rol                                | Firma |
| ------ | ---------------------------------- | ----- |
|        | Cliente: profesor(a) representante |       |
|        | Cliente: dirección o secretaría    |       |
| Lujan  | Autor (Líder y Arquitecto)         |       |
| Galvan | Responsable SQA                    |       |
