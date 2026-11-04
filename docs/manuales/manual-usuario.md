# CalisFacu v1.0: manual de usuario

> T-065 (SQAP, Sección 4). Explica, por rol, cómo hacer cada tarea en CalisFacu. Criterio de aceptación: un profesor
> piloto registra las notas de una actividad usando solo este manual. Las pantallas son del ambiente de pruebas, con
> datos ficticios.

## 1. Entrar al sistema

1. Abra la dirección de CalisFacu que le dio la unidad educativa.
2. Escriba su correo y su contraseña y pulse **Ingresar**.
3. El sistema muestra solo las opciones de su rol (profesor, secretaria, administrador o padre de familia).

![Inicio de sesión](capturas/m01-ingresar.png)

- La sesión se cierra sola después de 30 minutos sin usar el sistema. Mientras trabaja, se renueva sola.
- Si se equivoca 5 veces seguidas de contraseña, la cuenta se bloquea 15 minutos. Si aparece «Demasiados intentos de
  inicio de sesión», espere un minuto y vuelva a intentar.
- Para salir, pulse **Salir**, abajo a la izquierda.

## 2. Profesor

### 2.1 Ver sus materias

**Mis materias** muestra las materias que usted dicta, con su curso. Pulse **Ver actividades** en una materia.

![Mis materias](capturas/m02-mis-materias.png)

### 2.2 Crear una actividad y registrar sus notas

La nota trimestral se calcula con cuatro dimensiones (Ser 10, Saber 45, Hacer 40 y Autoevaluación 5 puntos). Cada
actividad pertenece a una dimensión.

1. En la materia, elija el **trimestre** y la **dimensión** (pestañas).
2. Pulse **Nueva actividad**, escriba el nombre (por ejemplo, «Examen 1») y guárdela.
3. Pulse la actividad para abrir su planilla.

![Actividades de una materia](capturas/m03-actividades.png)

4. Escriba la nota de cada estudiante, de **1 a 100** (hasta 2 decimales). **Enter** pasa al siguiente estudiante.
   Una actividad no presentada se registra con 1.
5. Pulse **Guardar notas**. Se guardan todas o ninguna: si alguna está fuera de 1 a 100, el sistema la marca y no guarda.

![Planilla de una actividad](capturas/m04-planilla.png)

Una nota ya guardada no se cambia en la planilla: se corrige con una solicitud (Sección 2.4).

### 2.3 Importar las notas desde Excel

1. En la planilla, pulse **Importar desde Excel** y luego **Descargar plantilla Excel**.
2. Complete la columna **Nota** de la plantilla (no cambie los códigos RUDE) y súbala.
3. Revise la vista previa: las filas con problemas aparecen con su motivo. Pulse **Confirmar e Importar** para guardar las filas
   válidas.

![Importar desde Excel](capturas/m05-importar.png)

### 2.4 Corregir una nota ya registrada

1. En la planilla, pulse **Pedir edición** junto a la nota (o **Solicitar edición de notas** para varios estudiantes) y
   escriba el motivo.
2. El administrador aprueba o rechaza la solicitud (Sección 4.2).
3. Con la solicitud aprobada, escriba la nota nueva y el motivo de la corrección. Cada solicitud aprobada permite una
   sola corrección. **Historial** muestra todos los cambios de la nota, con quién y cuándo.

### 2.5 Tomar asistencia

En la materia, pulse **Control de asistencia**, elija la fecha de la clase (no puede ser futura), marque a cada
estudiante como presente, ausente o con licencia y guarde. La pestaña de porcentajes muestra la asistencia acumulada
(la licencia cuenta como asistencia).

![Asistencia](capturas/m06-asistencia.png)

### 2.6 Ver las notas del trimestre, el panel de riesgo y el historial

- **Ver notas del trimestre:** la nota trimestral de cada estudiante con los puntos de cada dimensión. «Pendiente»
  significa que falta alguna dimensión.
- **Panel de riesgo:** resalta a los estudiantes con nota menor que 51 o asistencia menor que el umbral de la gestión.
- **Historial** de un estudiante: sus notas de todas las materias por trimestre y su promedio anual.

![Notas del trimestre](capturas/m07-notas-trimestre.png)

![Panel de riesgo](capturas/m08-panel-riesgo.png)

![Historial del estudiante](capturas/m10-historial.png)

### 2.7 Generar boletines

En la materia, pulse **Generar boletines**: descargue el boletín en PDF de un estudiante, o el de todo el curso con
**Generar todos los boletines** (se prepara en segundo plano y avisa cuando está listo para descargar).

![Boletines del curso](capturas/m09-boletines.png)

### 2.8 Entregar las notas del trimestre

Cuando todos los estudiantes tienen nota en todas las actividades del trimestre, abra **Ver notas del trimestre** y
pulse **Marcar trimestre como entregado**. La entrega no se deshace; las correcciones posteriores siguen el paso 2.4.

### 2.9 Alertas tempranas

Cuando una nota deja a un estudiante por debajo de 51 en su materia, usted recibe una alerta en **Alertas tempranas** y
un correo. La alerta muestra la nota nueva, la anterior y el tutor del estudiante. No se repite mientras el estudiante
siga por debajo de 51.

1. Pulse **Marcar leída** cuando la haya visto.
2. Después de hablar con el tutor, pulse **Marcar como atendida** y escriba qué se acordó.

![Alertas tempranas](capturas/m11-alertas.png)

## 3. Secretaria

### 3.1 Cursos, estudiantes y materias

- **Cursos:** cree los cursos de la gestión (nivel, año de escolaridad y paralelo).
- **Estudiantes:** inscriba a cada estudiante en su curso con su código RUDE (no se repite en la gestión) y, si se
  tiene, su CI.
- **Materias y asignaciones:** cree las materias de cada curso y asigne a cada una su profesor.

![Cursos](capturas/m12-cursos.png)

![Estudiantes](capturas/m13-estudiantes.png)

![Materias y asignaciones](capturas/m14-materias.png)

### 3.2 Control de entregas

Muestra, por curso, qué materias ya entregaron sus notas del trimestre y cuántas notas les faltan a las demás. Se puede
filtrar por estado y buscar por materia o profesor.

![Control de entregas](capturas/m15-control-entregas.png)

### 3.3 Centralizar las notas del trimestre

1. En **Centralizador de notas**, elija el curso y el trimestre. La planilla consolidada muestra la nota de cada
   estudiante en cada materia. Un estudiante aprueba el trimestre si aprueba todas sus materias.
2. Si falta entregar alguna materia, el sistema la lista y no deja centralizar.
3. Con todas entregadas, pulse **Ejecutar centralización oficial**.
4. Después de centralizar, descargue la planilla oficial con **Exportar planilla PDF** o **Exportar Excel**: incluye la
   hoja consolidada y una hoja por materia, con espacio para las firmas del director(a) y del maestro(a).

![Centralizador](capturas/m16-centralizador.png)

### 3.4 Vincular a los padres con sus hijos

En **Vínculos familiares**, pulse **Vincular padre y estudiante**, elija la cuenta del padre o tutor, el estudiante y
el parentesco. Un estudiante puede tener varios tutores. El padre solo ve a los hijos vinculados.

![Vínculos familiares](capturas/m17-vinculos.png)

### 3.5 Publicar los boletines

En **Publicación de boletines**, elija el curso: cuando todas las materias entregaron las notas de un trimestre, pulse
**Publicar boletín**. Desde ese momento los padres ven las notas de ese trimestre y reciben un aviso en el sistema y por
correo. Si se publicó por error, **Retirar publicación** lo oculta (no se vuelve a enviar el aviso al publicar de nuevo).

![Publicación de boletines](capturas/m18-publicacion.png)

### 3.6 Datos de la unidad educativa

En **Unidad educativa** se cambian el nombre y el código SIE que aparecen en los boletines y en las planillas.

![Unidad educativa](capturas/m19-unidad-educativa.png)

## 4. Administrador

### 4.1 Dimensiones de evaluación

En **Dimensiones de evaluación** se configuran, por gestión, las dimensiones y su puntaje máximo (deben sumar 100). Una
vez que hay notas registradas en la gestión, quedan bloqueadas.

![Dimensiones](capturas/m20-dimensiones.png)

### 4.2 Solicitudes de edición

En **Solicitudes de edición** aparecen las correcciones que piden los profesores. Revise el motivo y pulse **Aprobar**
o **Rechazar** (el rechazo pide una observación para el profesor).

![Solicitudes de edición](capturas/m21-solicitudes.png)

## 5. Padre de familia

### 5.1 Ver y descargar el boletín

En **Boletín de mi hijo**, elija al hijo (si tiene más de uno). Se muestran las notas de los trimestres ya publicados;
pulse **Descargar boletín oficial (PDF)** para guardarlo. La nota anual aparece cuando están publicados los tres
trimestres.

![Boletín del hijo](capturas/m22-boletin-padre.png)

### 5.2 Avisos del boletín

En **Avisos del boletín** aparece un aviso cada vez que se publica un boletín de su hijo, con el estado del correo que
se le envió. Pulse **Marcar como leído** o **Ver boletín oficial**.

![Avisos del boletín](capturas/m23-avisos-padre.png)

## 6. Preguntas frecuentes

| Pregunta                                      | Respuesta                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ¿Por qué la nota trimestral dice «Pendiente»? | Falta al menos una nota en alguna dimensión (Ser, Saber, Hacer o Autoevaluación).                 |
| ¿Cómo se redondea?                            | Al entero, 0,5 hacia arriba, solo al final de la suma de las dimensiones.                         |
| No puedo guardar notas en un trimestre        | El trimestre está cerrado (se centralizó y cerró). Las correcciones ya no se hacen en el sistema. |
| El profesor no ve un curso                    | La secretaria no le asignó ninguna materia de ese curso.                                          |
| El padre no ve las notas                      | El boletín de ese trimestre todavía no se publicó o el padre no está vinculado al estudiante.     |
