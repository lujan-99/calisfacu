# Guía de Enlace Frontend $\rightarrow$ Backend · Sprint 2 (CalisFacu v1.0)

> **Documento de Coordinación Técnica entre Galvan (Frontend) y Lujan (Backend)**  
> **Última actualización:** Sprint 2 (US-04, US-03, US-05 y US-19 implementadas en Frontend)  
> **Propósito:** Brindar a Lujan el contexto exacto de las pantallas, tipos, endpoints, payloads esperados y reglas de negocio implementadas en el frontend para que el desarrollo en el backend se enlace sin fricciones ni discrepancias de contrato.

---

## 1. Resumen de Estado del Frontend

| Historia / Ajuste      | Tarea Frontend          | Estado Frontend | Endpoints Backend Involucrados                                                                              | Acción Pendiente en Backend (Lujan)                                                                                  |
| :--------------------- | :---------------------- | :-------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Sprint 1 (Ajustes)** | Tickets de edición      | ✅ Completo     | `POST /notas/solicitudes-edicion` (opcional)                                                                | Opcional: persistencia en BD si se pasa de client storage a tabla.                                                   |
| **Sprint 1 (Ajustes)** | Campo CI en Estudiantes | ✅ Completo     | `POST /estudiantes`, `PUT /estudiantes/:id`                                                                 | **Obligatorio:** Agregar columna `ci` y DTO en backend.                                                              |
| **Sprint 2 · US-04**   | T-032 / T-033           | ✅ Completo     | `PATCH /notas/:id/correccion`, `GET /notas/:id/historial`                                                   | **Recomendado:** Devolver `notaId` en `GET /notas/actividades/:id`.                                                  |
| **Sprint 2 · US-03**   | T-035                   | ✅ Completo     | `GET /estudiantes/:id/historial`                                                                            | **Obligatorio (T-034):** Implementar endpoint con control de acceso 403.                                             |
| **Sprint 2 · US-05**   | T-039                   | ✅ Completo     | `POST /notas/actividades/:id/importar/vista-previa`, `POST /notas/actividades/:id/importar`                 | **Obligatorio (T-038):** Parser server-side con `exceljs`, validación por fila y auditoría con origen `IMPORTACION`. |
| **Sprint 2 · US-19**   | T-037                   | ✅ Completo     | `GET /materias/:id/asistencia`, `POST /materias/:id/asistencia`, `GET /materias/:id/asistencia/porcentajes` | **Obligatorio (T-036):** Registro de asistencia diaria, cálculo porcentaje D5 y bloqueo de fechas futuras.           |

---

## 2. Ajustes Previos del Sprint 1

### A. Campo CI (Cédula de Identidad) de Estudiantes

- **Qué hizo el Front:**
  - Se agregó el campo **CI** en el formulario de creación/edición de estudiantes (`Estudiantes.tsx`) con validación de formato alfanumérico boliviano (`12345678`, `1234567-1A`).
  - Se agregó la columna **CI** en la tabla de estudiantes junto al código RUDE.
  - **Nota técnica importante:** Dado que el backend NestJS tiene configurado `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, si el frontend envía el campo `ci` en el payload JSON actual, la API responde con `HTTP 400 Bad Request (property ci should not exist)`. Por ello, el front actualmente limpia la propiedad `ci` antes del envío HTTP y la almacena localmente de forma provisional.
- **Acción requerida para Lujan en Backend:**
  1. En `api/src/database/entities/academico.entity.ts`, agregar a la entidad `Estudiante`:
     ```typescript
     @Column({ type: 'varchar', length: 20, nullable: true })
     ci: string | null;
     ```
  2. En `api/src/modules/academico/academico.dto.ts`, agregar en `DatosEstudianteDto`:
     ```typescript
     @ApiPropertyOptional({ example: '12345678' })
     @IsOptional()
     @IsString()
     @MaxLength(20)
     ci?: string;
     ```
  3. Generar la migración TypeORM: `npm run -w api db:migration:generate src/database/migrations/EstudianteCi`.

### B. Tickets de Habilitación de Edición de Notas

- **Qué hizo el Front:**
  - Cuando una nota ya está guardada, queda bloqueada con candado.
  - El profesor puede generar un ticket formal seleccionando estudiantes y motivo justificativo.
  - El Administrador cuenta con la pantalla `/admin/solicitudes-edicion` para aprobar o rechazar formalmente.
  - Una vez aprobada, el casillero se desbloquea temporalmente hasta que el profesor guarda los cambios.

### C. Técnica de Burbuja y Prevención de Borrado

- Se implementó una **burbuja de impacto académico** al intentar dar de baja a un estudiante, advirtiendo sobre la repercusión en boletines e historial de notas.
- Se implementó aislamiento de eventos DOM (`e.stopPropagation()`) en las acciones de tabla para evitar propagación hacia contenedores.

---

## 3. Sprint 2 · US-04: Corrección Auditable de Notas

### Contexto de la Historia

> _Como profesor, quiero corregir una nota ya registrada y que el sistema guarde quién la cambió, cuándo y cuál era el valor anterior, para poder justificar cualquier corrección ante los padres o la dirección académica._

### A. Pantalla y Flujo Frontend Implementado (T-032 / T-033)

- En `Planilla.tsx`:
  - Cada fila con nota registrada cuenta con botón **"Corregir"** (`[data-cy=btn-corregir-nota]`) y botón **"Historial"** (`[data-cy=btn-historial-nota]`).
  - La barra superior cuenta con **"Auditoría de cambios"** (`[data-cy=btn-auditoria-actividad]`) para ver el consolidado de toda la actividad.
  - El modal de corrección exige de forma obligatoria:
    1. Nueva nota válida (1 a 100).
    2. Nueva nota diferente a la actual (si es igual, arroja error).
    3. Motivo justificado obligatorio (no vacío).
  - El modal de historial muestra de forma inmutable (solo lectura):
    - Quién registró o corrigió la nota.
    - Fecha y hora formateada.
    - Valor anterior y valor nuevo.
    - Motivo justificado.
    - Origen (`REGISTRO` o `CORRECCION`).

### B. Endpoints de la API ya preparados en el Frontend

El cliente HTTP (`web/src/lib/api.ts`) consume:

1. **Corregir Nota:**
   - **Ruta:** `PATCH /api/notas/:id/correccion`
   - **Body enviado:**
     ```json
     {
       "valor": 85,
       "motivo": "Error de transcripción en la prueba física"
     }
     ```
   - **Respuesta esperada (200 OK):**
     ```json
     {
       "notaId": 12,
       "valorAnterior": 60,
       "valorNuevo": 85
     }
     ```
2. **Historial de una Nota:**
   - **Ruta:** `GET /api/notas/:id/historial`
   - **Respuesta esperada (200 OK):**
     ```json
     [
       {
         "fecha": "2026-10-20T10:00:00.000Z",
         "usuario": "Ana Profesora",
         "valorAnterior": null,
         "valorNuevo": 60,
         "motivo": null,
         "origen": "REGISTRO"
       },
       {
         "fecha": "2026-10-20T15:30:00.000Z",
         "usuario": "Ana Profesora",
         "valorAnterior": 60,
         "valorNuevo": 85,
         "motivo": "Error de transcripción en la prueba física",
         "origen": "CORRECCION"
       }
     ]
     ```

### C. Acción sugerida para Lujan en Backend

En `api/src/modules/notas/notas.service.ts` método `planilla(actividadId)`:

- Actualmente `filas` retorna `{ estudianteId, estudiante, valor }`.
- Para enlazar el botón "Corregir" directamente con el endpoint `PATCH /api/notas/:id/correccion`, Lujan debe devolver el `id` de la entidad `Nota`:
  ```typescript
  filas: estudiantes.map((e) => ({
    estudianteId: e.id,
    estudiante: `${e.apellidos}, ${e.nombres}`,
    valor: porEstudiante.get(e.id) ?? null,
    notaId: porEstudianteNotaId.get(e.id) ?? null, // <--- Agregar esta propiedad
  }));
  ```

---

## 4. Sprint 2 · US-03: Historial Académico del Estudiante

### Contexto de la Historia

> _Como profesor, quiero consultar en cualquier momento el historial completo de notas de un estudiante a lo largo del año, para identificar su evolución académica sin tener que buscar en registros físicos anteriores._

### A. Pantalla y Flujo Frontend Implementado (T-035)

- **Ruta protegida:** `/profesor/estudiantes/:estudianteId/historial`
- **Componente:** `HistorialEstudiante.tsx`
- **Características de la UI:**
  - Header Hero con datos completos del estudiante (Nombres, RUDE, CI, Curso, Gestión).
  - Tarjetas de resumen anual:
    - **Promedio Anual Acumulado** (ej. 78,5).
    - **Tendencia** (`ASCENDENTE 📈`, `ESTABLE ⚖️`, `DESCENDENTE 📉`, `PENDIENTE ⏳`).
    - **Condición Anual** (`Promovido`, `En riesgo`, `Regular`).
  - Tarjetas selectoras por cada trimestre en orden cronológico (1.er, 2.º y 3.er Trimestre) con su promedio trimestral respectivo.
  - Tabla detallada por materias del trimestre activo, desglosando dimensiones ministeriales (Ser /10, Saber /45, Hacer /40, Autoevaluación /5), nota final (/100) y estado (`Aprueba` / `Reprueba`).
  - Manejo integral del error `HTTP 403 Forbidden` mostrando el aviso de acceso denegado y botón de retorno seguro.

### B. Especificación del Endpoint a Implementar por Lujan (T-034)

- **Método:** `GET`
- **Ruta:** `/api/estudiantes/:id/historial` (o `/api/calculo/estudiantes/:id/historial`)
- **Roles:** `@Roles(Rol.PROFESOR, Rol.SECRETARIA, Rol.ADMINISTRADOR)`

#### Regla Crítica de Autorización (Criterio de Aceptación 2 / SQAP M09)

> _Dado un estudiante que no cursa ninguna materia del profesor, cuando el profesor intenta abrir su historial, entonces recibe HTTP 403._

- **Lógica en el Backend:**
  Si el usuario autenticado tiene el rol `Rol.PROFESOR`:
  1. Verificar si el profesor tiene asignada al menos una materia en el curso actual del estudiante (`AccesoNotasService.verificarAccesoEstudiante`).
  2. Si el profesor **NO** le dicta clases al estudiante $\rightarrow$ lanzar `throw new ForbiddenException('No tiene acceso a las calificaciones de este estudiante')` (`HTTP 403`).
  3. Si es `SECRETARIA` o `ADMINISTRADOR` $\rightarrow$ acceso autorizado (`HTTP 200`).

#### Contrato JSON de Respuesta (200 OK)

```typescript
{
  "estudiante": {
    "id": 1,
    "codigoRude": "809800012026001",
    "ci": "12345678",
    "nombres": "Miguel",
    "apellidos": "Apaza Condori",
    "curso": {
      "id": 3,
      "nombre": "Secundaria 4.º «A»"
    },
    "gestion": {
      "id": 1,
      "anio": 2026
    }
  },
  "promedioAnual": 78.5,
  "tendencia": "ASCENDENTE", // "ASCENDENTE" | "DESCENDENTE" | "ESTABLE" | "PENDIENTE"
  "estadoAnual": "PROMOVIDO", // "PROMOVIDO" | "EN_RIESGO" | "PENDIENTE"
  "trimestres": [
    {
      "trimestreId": 21,
      "numero": 1,
      "cerrado": true,
      "promedioTrimestral": 74.0,
      "materias": [
        {
          "materiaId": 7,
          "materia": "Matemática",
          "profesor": "Rosa Mamani Condori",
          "dimensiones": [
            { "codigo": "SER", "nombre": "Ser", "puntos": 8.0, "puntajeMaximo": 10 },
            { "codigo": "SABER", "nombre": "Saber", "puntos": 32.0, "puntajeMaximo": 45 },
            { "codigo": "HACER", "nombre": "Hacer", "puntos": 30.0, "puntajeMaximo": 40 },
            { "codigo": "AUTOEVALUACION", "nombre": "Autoevaluación", "puntos": 4.0, "puntajeMaximo": 5 }
          ],
          "nota": 74,
          "aprobado": true,
          "pendientes": []
        }
      ]
    },
    {
      "trimestreId": 22,
      "numero": 2,
      "cerrado": false,
      "promedioTrimestral": 83.0,
      "materias": [
        {
          "materiaId": 7,
          "materia": "Matemática",
          "profesor": "Rosa Mamani Condori",
          "dimensiones": [
            { "codigo": "SER", "nombre": "Ser", "puntos": 9.0, "puntajeMaximo": 10 },
            { "codigo": "SABER", "nombre": "Saber", "puntos": 38.0, "puntajeMaximo": 45 },
            { "codigo": "HACER", "nombre": "Hacer", "puntos": 32.0, "puntajeMaximo": 40 },
            { "codigo": "AUTOEVALUACION", "nombre": "Autoevaluación", "puntos": 4.0, "puntajeMaximo": 5 }
          ],
          "nota": 83,
          "aprobado": true,
          "pendientes": []
        }
      ]
    },
    {
      "trimestreId": 23,
      "numero": 3,
      "cerrado": false,
      "promedioTrimestral": null,
      "materias": []
    }
  ]
}
```

---

## 5. Sprint 2 · US-05: Importación de Calificaciones desde Excel

### Contexto de la Historia

> _Como profesor, quiero importar las notas que ya tengo registradas en planillas Excel para migrarlas al sistema sin volver a digitarlas una por una, para que la adopción no me genere doble trabajo._

### A. Pantalla y Flujos Frontend Implementados (T-039)

- **Ruta protegida:** `/profesor/materias/:materiaId/actividades/:actividadId/importar`
- **Punto de Entrada:**
  - En `Planilla.tsx`: Botón **"Importar desde Excel"** (`[data-cy=btn-importar-excel]`) con ícono de documento en la barra de herramientas de la planilla.
- **Componente Principal:** `ImportarNotas.tsx` (`web/src/pages/profesor/ImportarNotas.tsx`)
- **Módulo de Parsing y Plantilla:** `importacionExcel.ts` (`web/src/lib/importacionExcel.ts`)
- **Características de la UI y Criterios de Aceptación Cubiertos:**
  1. **Descarga de Plantilla Oficial:** Botón **"Descargar plantilla Excel (CSV)"** (`[data-cy=btn-descargar-plantilla]`) que genera un archivo CSV prellenado con los estudiantes matriculados en la materia y curso (`N.º, Apellidos y Nombres, Nota (1-100)`).
  2. **Doble Modalidad de Entrada:**
     - **Opción 1:** Carga de archivo (`.xlsx`, `.csv`, `.txt`) arrastrando o buscando en el explorador.
     - **Opción 2:** Pegado directo desde Excel (`Ctrl + C` en Excel y `Ctrl + V` en el área de texto con tabulaciones nativas).
  3. **Generación de Vista Previa Inmediata (Criterio 1):**
     - Muestra métricas consolidadas: Total analizadas, Válidas para migrar, y Observadas.
     - Pestañas interactivas:
       - **Válidas (`[data-cy=tab-ver-validas]`):** Estudiante identificado, RUDE y nota a registrar.
       - **Observadas (`[data-cy=tab-ver-errores]`):** Número de línea en el Excel/archivo, dato ingresado y motivo exacto de rechazo.
  4. **Validaciones por Fila (Criterio 2):**
     - Rechazo con motivo claro si el RUDE o nombre no coincide con ningún estudiante del curso (`El estudiante "..." no existe o no pertenece a este curso`).
     - Rechazo con motivo claro si la nota está fuera de 1 a 100 (`La nota debe estar entre 1 y 100`).
     - Rechazo si no es numérico o tiene más de 2 decimales.
  5. **Confirmación e Importación Atómica (Criterio 3):**
     - Botón `Confirmar e Importar (X notas)` (`[data-cy=btn-confirmar-importacion]`).
     - Solo migra las filas válidas (las observadas se descartan sin interrumpir la migración).
     - Guarda las notas mediante `api.guardarPlanilla(actividadId, notasPayload)`.
     - Registra cada nota en la tabla de auditoría con origen oficial `'IMPORTACION'`.

### B. Especificaciones Técnicas para Lujan en el Backend (T-038)

Para completar la tarea **T-038** del backend con `exceljs`, Lujan debe implementar o verificar los siguientes componentes:

#### 1. Endpoints Backend Sugeridos

- **Endpoint de Vista Previa (Parsing de archivo binario `.xlsx` en el servidor con `exceljs`):**
  - **Método:** `POST`
  - **Ruta:** `/api/notas/actividades/:id/importar/vista-previa`
  - **Content-Type:** `multipart/form-data` (campo `archivo`)
  - **Roles:** `@Roles(Rol.PROFESOR)` con verificación de `AccesoNotasService`.
  - **Contrato JSON de Respuesta:**
    ```json
    {
      "totalFilas": 3,
      "resumen": { "total": 3, "validas": 1, "errores": 2 },
      "filasValidas": [
        {
          "estudianteId": 1,
          "codigoRude": "809800012026001",
          "estudiante": "Apaza Condori, Miguel",
          "valor": 88
        }
      ],
      "filasObservadas": [
        {
          "linea": 2,
          "identificador": "999999999999999",
          "valorIngresado": "75",
          "motivo": "El estudiante \"999999999999999\" no existe o no pertenece a este curso"
        },
        {
          "linea": 3,
          "identificador": "Choque Huanca, Rosa",
          "valorIngresado": "105",
          "motivo": "La nota debe estar entre 1 y 100"
        }
      ]
    }
    ```

- **Endpoint de Confirmación Definitiva (o reutilización de `guardarPlanilla`):**
  - **Método:** `POST`
  - **Ruta:** `/api/notas/actividades/:id/importar` (o `POST /api/notas/planilla` con parámetro `origen: 'IMPORTACION'`)
  - **Payload:**
    ```json
    {
      "actividadId": 5,
      "notas": [{ "estudianteId": 1, "valor": 88 }],
      "origen": "IMPORTACION"
    }
    ```

#### 2. Requerimientos Críticos de Backend para T-038 (SQAP, RNF-04, M01)

1. **Uso de `exceljs`:** Instalar únicamente `exceljs` (licencia MIT) en `api/` verificando `npm audit`.
2. **Auditoría Obligatoria en la Misma Transacción:**
   - La entidad `RegistroAuditoria` (`api/src/database/entities/evaluacion.entity.ts`) ya contiene la columna `origen` de tipo enum `OrigenCambio` con los valores `'REGISTRO' | 'CORRECCION' | 'IMPORTACION'`.
   - Cuando se guardan notas mediante importación, Lujan debe asegurar que el servicio `NotasService` inserte el registro de auditoría con:
     ```typescript
     origen: OrigenCambio.IMPORTACION,
     motivo: 'Importación inicial desde planilla Excel',
     usuarioId: usuario.id,
     valorAnterior: null,
     valorNuevo: nota.valor
     ```
3. **Escala Decimal Estricta:**
   - Como manda la RM 001/2026 y la regla 5 de `AGENTS.md`, las notas deben validarse entre 1 y 100 con decimales manejados con precisión estricta (`decimal.js`).
4. **Resistencia a Rechazos:**
   - Si una fila tiene error en el archivo, el backend no debe abortar toda la vista previa: debe reportarla en el arreglo `filasObservadas` con el número de fila real del archivo Excel para que el profesor sepa en qué celda corregir.

---

---

## 6. Sprint 2 · US-19: Registro de Asistencia por Clase y Cálculo de Porcentaje

### A. Contexto y Objetivos

- **Historia:** _"Como profesor, quiero registrar la asistencia de mis estudiantes en cada clase, para que el sistema calcule su porcentaje de asistencia sin llevarlo en un cuaderno aparte."_
- **Normativa y Decisiones:**
  - **Decisión D5:** El porcentaje se calcula como `(presentes + licencias) / clases dictadas × 100`, redondeado a un decimal. Las licencias computan a favor de la asistencia del estudiante.
  - **Criterio 3:** Bloqueo estricto del registro de asistencia con fechas futuras respecto a la hora oficial de Bolivia (`America/La_Paz`).
  - **Criterio 1:** La lista de asistencia de la clase debe registrarse completa (presente, ausente o con licencia).

### B. Qué Construyó el Frontend (Tarea T-037)

1. **Pantalla Principal `AsistenciaMateria.tsx` (`web/src/pages/profesor/AsistenciaMateria.tsx`):**
   - **Banner Hero Institucional:** Muestra métricas clave en tiempo real: número total de estudiantes inscritos, total de asistencias de la fecha (presentes + licencias) y porcentaje de asistencia de la clase del día.
   - **Selector de Fecha con Control de Horario Boliviano:**
     - Restringe el atributo HTML `max` a la fecha actual en Bolivia (`hoyEnBolivia()`).
     - Alerta visual y deshabilitación preventiva si se intenta ingresar una fecha futura (US-19 Criterio 3).
     - Etiqueta "Hoy en Bolivia" para retroalimentación inmediata.
   - **Botones de Marcado Rápido Masivo:**
     - "Marcar todos Presentes" y "Marcar todos Ausentes" para agilizar el registro diario en aula.
   - **Tabla Interactiva de Clase:**
     - Cada estudiante cuenta con un grupo de opciones excluyentes tipo radio (`PRESENTE`, `LICENCIA`, `AUSENTE`).
     - Marcadores de estado accesibles con colores diferenciados según el sistema de diseño (verde para presente, ámbar para licencia, rojo para ausente).
     - Atributos accesibles y de prueba: `role="radio"`, `aria-checked`, `data-cy` y `data-testid` individuales por estudiante (`btn-presente-:id`, `btn-licencia-:id`, `btn-ausente-:id`).
   - **Barra de Resumen y Validación de Integridad:**
     - Contador dinámico en vivo: `Marcados: X presentes · Y licencias · Z ausentes`.
     - Indicador de alerta de estudiantes pendientes de marcado.
     - Botón de guardado deshabilitado hasta que la lista de la clase esté 100% marcada (Criterio 1).
   - **Pestaña Secundaria: "Porcentajes acumulados (D5)":**
     - Filtros de rango de fechas (Desde / Hasta) opcionales.
     - Tarjetas métricas de consolidado: Promedio general del curso, Estudiantes regulares (≥ 80%), Estudiantes en riesgo (< 80%) y Total de clases computadas.
     - Tabla por estudiante con desglose de clases, presentes, licencias, ausentes, barra visual de progreso y etiqueta de estado ("Regular" o "En riesgo").

2. **Módulo de Lógica Pura y Dominio `asistencia.ts` (`web/src/lib/asistencia.ts`):**
   - `hoyEnBolivia()`: Obtiene la fecha `YYYY-MM-DD` en la zona horaria `America/La_Paz`.
   - `esFechaFutura(fecha, hoy)`: Compara estrictamente contra la fecha de Bolivia.
   - `calcularPorcentajeAsistencia({ presentes, licencias, clases })`: Implementación estricta de la fórmula D5 con redondeo a un decimal (`Math.round(val * 10) / 10`). Si `clases == 0`, retorna `0.0`.
   - `nivelAsistencia(porcentaje)`: Retorna `'REGULAR'` si $\ge 80.0$ o `'EN_RIESGO'` si $< 80.0$.
   - `formatoPorcentaje(porcentaje)`: Formatea a formato legible con coma decimal boliviana (ej. `90,0 %`).

3. **Enrutamiento y Navegación:**
   - Registrada la ruta `/profesor/materias/:materiaId/asistencia` en `web/src/App.tsx` bajo control de rol `PROFESOR`.
   - Botón directo "Control de asistencia" con insignia institucional en la pantalla de actividades de la materia (`MateriaActividades.tsx`).

### C. Contrato de Endpoints y Payloads para Backend (Lujan, T-036)

#### 1. Obtener asistencia de una clase / fecha

- **Método:** `GET`
- **Ruta:** `/api/materias/:materiaId/asistencia`
- **Query Params:** `?fecha=YYYY-MM-DD` (obligatorio)
- **Control de Acceso:** Rol `PROFESOR`, verificar asignación profesor–materia (403 si no corresponde).
- **Validación:** Si `fecha > hoy_en_bolivia`, responder `HTTP 400 Bad Request` con mensaje descriptivo ("No se puede registrar asistencia de una fecha futura").
- **Respuesta Esperada (`HTTP 200 OK`):**
  ```json
  {
    "materia": "Matemática",
    "fecha": "2026-04-15",
    "filas": [
      {
        "estudianteId": 1,
        "estudiante": "Apaza Condori, Miguel",
        "estado": "PRESENTE" // "PRESENTE" | "LICENCIA" | "AUSENTE" | null si no se ha tomado
      },
      {
        "estudianteId": 2,
        "estudiante": "Choque Huanca, Rosa",
        "estado": null
      }
    ]
  }
  ```

#### 2. Registrar o actualizar asistencia de la fecha

- **Método:** `POST`
- **Ruta:** `/api/materias/:materiaId/asistencia?fecha=YYYY-MM-DD`
- **Control de Acceso:** Rol `PROFESOR`, asignado a la materia.
- **Validaciones:**
  1. Si `fecha > hoy_en_bolivia` $\rightarrow$ `HTTP 400 Bad Request`.
  2. Todos los `estudianteId` deben pertenecer al curso de la materia.
  3. `estado` debe ser uno de: `'PRESENTE'`, `'LICENCIA'`, `'AUSENTE'`.
- **Payload (`RegistrarAsistenciaPayload`):**
  ```json
  {
    "registros": [
      { "estudianteId": 1, "estado": "PRESENTE" },
      { "estudianteId": 2, "estado": "LICENCIA" }
    ]
  }
  ```
- **Comportamiento en BD:** Guardado tipo _upsert_ transaccional (si ya existía registro para ese estudiante y fecha, actualiza el estado; si no, inserta).
- **Respuesta Esperada (`HTTP 201 Created` o `HTTP 200 OK`):**
  ```json
  {
    "fecha": "2026-04-15",
    "guardados": 2
  }
  ```

#### 3. Consultar porcentajes acumulados de asistencia por materia

- **Método:** `GET`
- **Ruta:** `/api/materias/:materiaId/asistencia/porcentajes`
- **Query Params (opcionales):** `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`
- **Respuesta Esperada (`HTTP 200 OK`):**
  ```json
  [
    {
      "estudianteId": 1,
      "estudiante": "Apaza Condori, Miguel",
      "clases": 10,
      "presentes": 8,
      "licencias": 1,
      "ausentes": 1,
      "porcentaje": 90.0
    },
    {
      "estudianteId": 2,
      "estudiante": "Choque Huanca, Rosa",
      "clases": 10,
      "presentes": 6,
      "licencias": 0,
      "ausentes": 4,
      "porcentaje": 60.0
    }
  ]
  ```

---

## 7. Pruebas y Cobertura de Calidad

- **Frontend (Vitest):**
  - Suite `asistencia.test.ts` en `web/src/lib/asistencia.test.ts` (8 pruebas unitarias: fórmula D5, licencias, clases en cero, umbral 80%, redondeo a un decimal y validación de fechas futuras).
  - Suite `Registro de asistencia por clase (US-19, T-037)` en `web/src/pages/profesor/profesor.test.tsx` (4 pruebas de interfaz: renderizado y marcado individual/masivo, guardado completo de clase, bloqueo de fechas futuras y visualización de porcentajes acumulados).
  - Suite `Importación desde Excel (US-05, T-039)` en `profesor.test.tsx` (3 pruebas) y `importacionExcel.test.ts` (5 pruebas).
  - Suite `Historial académico del estudiante (US-03, T-035)` en `profesor.test.tsx` (3 pruebas).
  - Suite `Corrección auditable (US-04, T-032)` en `profesor.test.tsx` (4 pruebas).
  - Total de pruebas en `web/`: **117/117 pruebas pasando (100% de éxito)**.
- **Linter & Tipado:**
  - `npm run lint` $\rightarrow$ **0 errores, 0 advertencias** (`--max-warnings=0`).
  - Prettier verificado en todos los archivos del frontend.
- **Pruebas E2E preparadas:**
  - `e2e/cypress/e2e/correccion-auditable.cy.ts` (T-033 para US-04).
  - Cobertura de flujo de importación desde planilla de calificaciones.
  - Flujo de toma de asistencia diaria y cálculo de porcentaje acumulado listo para Cypress en T-036.

---

_Este documento se mantendrá actualizado conforme avancemos con las siguientes historias del Sprint 2._
