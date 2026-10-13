# Glosario

> El código, la interfaz, las pruebas y los documentos usan estos términos con este significado (SQAP, Sección 15).
> En el código, los términos del dominio van en español: `nota`, `trimestre`, `dimension`, `actividad`.

| Término                   | Definición                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Actividad                 | Tarea evaluada (examen, práctica, exposición) dentro de una dimensión; se califica de 1 a 100.                                             |
| Año de escolaridad        | Grado que cursa el estudiante dentro de su nivel (por ejemplo, 3.º de Secundaria).                                                         |
| Autoevaluación            | Dimensión en la que el estudiante valora su propio desempeño; 5 puntos según la RM 001/2026.                                               |
| Boletín                   | Documento PDF con las notas trimestrales y anuales y la asistencia de un estudiante (US-07).                                               |
| Centralizador             | Planilla consolidada de un curso con las notas de todas sus materias, con el formato oficial (US-09).                                      |
| Código SIE                | Código de la unidad educativa en el Sistema de Información Educativa del Ministerio de Educación.                                          |
| Curso                     | Combinación de año de escolaridad y paralelo en una gestión (por ejemplo, 3.º A de Secundaria, 2026).                                      |
| Dimensión                 | Componente de la evaluación con puntaje máximo fijado por el Ministerio: Ser, Saber, Hacer y Autoevaluación.                               |
| Gestión                   | Año escolar (por ejemplo, gestión 2026), dividido en tres trimestres.                                                                      |
| Nivel                     | Etapa del Subsistema de Educación Regular: Inicial, Primaria o Secundaria.                                                                 |
| Nota anual                | Nota de una materia en la gestión, calculada a partir de las tres notas trimestrales (Anexo F: confirmar la regla).                        |
| Nota mínima de aprobación | 51 puntos en la escala de 1 a 100.                                                                                                         |
| Nota trimestral           | Suma de los puntos de las cuatro dimensiones, redondeada al entero (US-02).                                                                |
| Paralelo                  | Grupo dentro de un año de escolaridad (A, B, C…).                                                                                          |
| Trimestre                 | Periodo de evaluación; la gestión tiene tres.                                                                                              |
| Unidad educativa          | Institución escolar cliente del sistema.                                                                                                   |
| ADR                       | Architecture Decision Record: nota breve que registra una decisión de arquitectura, sus alternativas y consecuencias.                      |
| BDD                       | Desarrollo guiado por comportamiento: criterios Dado/Cuando/Entonces que se convierten en pruebas.                                         |
| Conventional Commits      | Formato de mensajes de commit `tipo(ámbito): resumen` (Sección 10.3).                                                                      |
| Definition of Done (DoD)  | Condiciones para considerar una historia Hecha (hoja DoR y DoD del backlog).                                                               |
| Definition of Ready (DoR) | Condiciones para que una historia entre a un sprint.                                                                                       |
| Feature test / e2e-spec   | Prueba que ejercita una ruta HTTP completa de la API contra PostgreSQL, con Supertest.                                                     |
| Guard                     | Componente de NestJS que decide si una petición puede llegar al controlador (autorización).                                                |
| Migración                 | Cambio versionado del esquema de la base de datos, generado y aplicado con la CLI de TypeORM (`api/src/database/migrations/`).             |
| Módulo crítico            | Módulo cuya falla afecta notas oficiales o el acceso a ellas (Tabla 4).                                                                    |
| p95                       | Valor por debajo del cual está el 95 % de los tiempos de respuesta medidos.                                                                |
| Build sano                | Build que cumple los indicadores de las Prácticas 6 y 8 de la Sección 6.2, no solo el color verde.                                         |
| Prioridad                 | Con qué urgencia se corrige un defecto (P1 a P3). La fija el Líder.                                                                        |
| Quality Gate              | Conjunto de condiciones de SonarQube Cloud que un cambio debe cumplir para fusionarse.                                                     |
| RACI                      | Matriz que asigna, por actividad, quién ejecuta (R), rinde cuentas (A), es consultado (C) o informado (I).                                 |
| Release candidate (RC)    | Versión candidata etiquetada `v*-rc.*`, sobre la que se corren E2E y rendimiento.                                                          |
| RPO / RTO                 | Pérdida máxima de datos tolerada / tiempo máximo de restauración tras una falla.                                                           |
| Secreto                   | Dato de acceso (token, contraseña, URL con credenciales) que vive solo en Jenkins Credentials, GitHub Secrets o el panel de la plataforma. |
| SemVer                    | Versionado semántico MAYOR.MENOR.PARCHE.                                                                                                   |
| Severidad                 | Cuánto daño causa un defecto (S1 a S4). La fija el Tester o el Responsable SQA.                                                            |
| SLA                       | Tiempos máximos de respuesta y resolución de un defecto según su severidad.                                                                |
| Smoke test                | Verificación breve tras un despliegue: salud del servicio y commit desplegado.                                                             |
| Staging                   | Ambiente con la configuración de producción y datos sintéticos.                                                                            |
| SUS                       | System Usability Scale: cuestionario de 10 ítems con resultado de 0 a 100.                                                                 |
| TDD                       | Desarrollo guiado por pruebas: se escribe la prueba antes que el código.                                                                   |
