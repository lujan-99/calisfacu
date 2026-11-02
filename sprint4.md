# Guía de Integración y Especificación Backend — Sprint 4

> **Documento para:** Lujan (Líder / Arquitecto / Dev Backend)  
> **Elaborado por:** Galvan (Dev Frontend / Tester SQA)  
> **Proyecto:** CalisFacu v1.0 · Sistema Web de Registro de Calificaciones  
> **Normativa:** Resolución Ministerial 001/2026 del Ministerio de Educación (Bolivia)  
> **Sprint:** 4 (Cierre de gestión, centralización y consolidación institucional)  
> **Estado:** US-09 y US-08 Frontend Finalizados · Esperando Integración Backend

---

## 1. Resumen de Historias del Sprint 4

| Historia  | Título                      | Rol Primario  | Backend (Lujan)  | Frontend (Galvan) | Estado                         |
| :-------- | :-------------------------- | :------------ | :--------------- | :---------------- | :----------------------------- |
| **US-09** | **Centralización de Notas** | Secretaría    | **T-057, T-058** | **T-059**         | Frontend listo · Esperando API |
| **US-08** | **Alerta de Promedio Bajo** | Profesor      | **T-060, T-061** | **T-061**         | Frontend listo · Esperando API |
| **US-12** | Aviso de Boletín Disponible | Padre / Tutor | T-066, T-067     | T-068             | Planificada                    |
| **US-05** | Importación desde Excel     | Profesor      | T-032, T-033     | T-034             | Planificada                    |

---

## 2. Especificación Técnica para Backend: US-09 (Centralización de Notas)

### 2.1 Criterios de Aceptación a Cumplir (Backend)

1. **CA 1:** Dado el cierre del trimestre con todas las materias entregadas (`estado === 'ENTREGADO'`), al invocar la centralización, el sistema genera la planilla consolidada del curso con todas sus materias y calcula los promedios trimestrales oficiales (regla D2 `ROUND_HALF_UP` y D12).
2. **CA 2:** Exportación a **PDF** y **Excel (.xlsx)** con el formato oficial del Ministerio de Educación de Bolivia:
   - **Encabezado institucional:** Nombre de la Unidad Educativa, Código SIE, Nivel educativo, Año de escolaridad, Paralelo, Gestión y Trimestre.
   - **Cuerpo:** N.º correlativo, Código RUDE, Cédula de Identidad (CI), Apellidos y Nombres del Estudiante, una columna por cada materia del curso con su nota trimestral, columna de Promedio Trimestral, columna de Observaciones (`APROBADO` si $\ge 51$, `REPROBADO` si $< 51$).
   - **Pie reglamentario:** Resumen numérico institucional y espacios de firmas con sellos para el Director(a) y el Maestro(a) asesor(a).
3. **CA 3:** Dado una o más materias pendientes de entrega, al intentar ejecutar la centralización, el backend **debe rechazar la operación con HTTP 400 Bad Request**, retornar el listado de materias pendientes y **no cerrar el trimestre**.

---

### 2.2 Endpoints a Implementar en NestJS (`api/src/modules/centralizador/`)

#### A. Obtener Datos del Centralizador de un Curso

- **Método:** `GET`
- **Ruta:** `/api/centralizador/cursos/:cursoId?trimestreId=:trimestreId`
- **Seguridad:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('SECRETARIA', 'ADMINISTRADOR')`
- **Respuesta Exitosa (200 OK):**

```json
{
  "curso": {
    "id": 1,
    "nombre": "Secundaria 4.º «A»",
    "nivel": "SECUNDARIA",
    "anioEscolaridad": 4,
    "paralelo": "A"
  },
  "gestion": {
    "id": 1,
    "anio": 2026
  },
  "trimestre": {
    "id": 1,
    "numero": 1,
    "cerrado": false
  },
  "unidadEducativa": {
    "nombre": "Unidad Educativa Juana Azurduy",
    "codigoSie": "80980123"
  },
  "todasEntregadas": true,
  "materiasPendientes": [],
  "materias": [
    { "id": 101, "nombre": "Matemática", "profesor": "Carlos Quispe" },
    { "id": 102, "nombre": "Lenguaje y Comunicación", "profesor": "Ana Flores" }
  ],
  "filas": [
    {
      "numero": 1,
      "estudianteId": 1,
      "codigoRude": "80980001",
      "ci": "10203040",
      "apellidos": "Mamani Ramos",
      "nombres": "Alejandro",
      "estudiante": "Mamani Ramos, Alejandro",
      "notas": {
        "101": 85,
        "102": 90
      },
      "promedioTrimestral": 88,
      "observacion": "APROBADO"
    }
  ],
  "resumen": {
    "totalEstudiantes": 30,
    "promedioGeneral": 72.4,
    "aprobados": 28,
    "reprobados": 2,
    "pendientes": 0,
    "tasaAprobacion": 93.3
  }
}
```

---

#### B. Ejecutar Centralización Oficial del Curso (Cierre Trimestral)

- **Método:** `POST`
- **Ruta:** `/api/centralizador/cursos/:cursoId/ejecutar`
- **Seguridad:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('SECRETARIA', 'ADMINISTRADOR')`
- **Cuerpo de Solicitud (DTO):**

```json
{
  "trimestreId": 1,
  "cerrarTrimestre": false
}
```

- **Respuesta de Rechazo (400 Bad Request — CA 3):**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "No se puede centralizar el trimestre: existen materias pendientes de entrega.",
  "materiasPendientes": [
    {
      "materiaId": 102,
      "materia": "Lenguaje y Comunicación",
      "profesor": "Ana Flores",
      "notasFaltantes": 4
    }
  ]
}
```

- **Respuesta Exitosa (200 OK):**

```json
{
  "exito": true,
  "mensaje": "Centralización ejecutada exitosamente para Secundaria 4.º «A». Planilla consolidada generada.",
  "centralizador": {/* CentralizadorCursoData */}
}
```

---

#### C. Exportar Centralizador en Formato PDF Oficial (CA 2)

- **Método:** `GET`
- **Ruta:** `/api/centralizador/cursos/:cursoId/pdf?trimestreId=:trimestreId`
- **Cabeceras de Respuesta:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="Centralizador_Secundaria_4A_T1_2026.pdf"`
- **Librería sugerida:** `pdfkit` (ya homologada en ADR-0004 y en el backend para US-07).
- **Diseño del Documento:** Formato apaisado (Landscape A4 u Oficio), encabezado ministerial con código SIE, grilla con líneas divisorias, promedios finales y casillas de firma inferior.

---

#### D. Exportar Centralizador en Formato Excel Oficial (CA 2)

- **Método:** `GET`
- **Ruta:** `/api/centralizador/cursos/:cursoId/excel?trimestreId=:trimestreId`
- **Cabeceras de Respuesta:**
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="Centralizador_Secundaria_4A_T1_2026.xlsx"`
- **Librería sugerida:** `exceljs` (ya utilizada en el proyecto).

---

### 2.3 Reglas de Negocio Clave para Lujan (US-09)

1. **Cálculo con `decimal.js`:**
   - Todo cálculo de notas y promedios debe realizarse en `CalculoService` o servicio dedicado usando `Decimal`, nunca con aritmética de punto flotante nativa de JavaScript.
   - Redondeo ministerial: regla **D2** (`ROUND_HALF_UP`).
2. **Validación de Entregas (US-10 / US-09 CA 3):**
   - Una materia se considera entregada cuando su registro en `entrega_notas` tiene `estado = 'ENTREGADO'`.
   - Si `count(materias del curso) != count(materias entregadas)`, la centralización debe abortar inmediatamente.
3. **Auditoría Transaccional:**
   - La ejecución de la centralización debe registrar un evento en `registro_auditoria` con la acción `CENTRALIZACION_NOTAS_TRIMESTRE`, usuario responsable (secretaria) y metadatos del curso.
4. **Pruebas Automatizadas Requeridas:**
   - `api/test/centralizador.e2e-spec.ts` (Supertest contra PostgreSQL en el puerto 55432).
   - Cobertura $\ge 90\,\%$ del módulo nuevo (`api/jest.config.ts`).

---

### 2.4 Estado de la Capa Frontend (Galvan)

- **Módulo frontend:** `web/src/lib/centralizador.ts` (tipos, validadores, fallback resiliente y exportadores CSV/PDF/Excel).
- **Pruebas unitarias:** `web/src/lib/centralizador.test.ts` (11 pruebas pasando al 100 %).
- **Pantalla:** `web/src/pages/secretaria/Centralizador.tsx` (registrada en `/secretaria/centralizador` y agregada al menú de navegación con icono de tabla).
- **Pruebas de interfaz:** `web/src/pages/secretaria/secretaria.test.tsx` (4 nuevas pruebas cubriendo CA 1, CA 2, CA 3 y filtrado).
- **Compatibilidad:** El frontend cuenta con un fallback local para funcionar de manera reactiva e inmediata mientras Lujan despliega los nuevos endpoints en el backend.

---

## 3. Especificación Técnica para Backend: US-08 (Alerta de Promedio Bajo)

### 3.1 Criterios de Aceptación a Cumplir (Backend)

1. **CA 1:** Dado un estudiante con promedio $\ge 51$, cuando una nueva nota o recálculo lo deja por debajo de 51 puntos, el sistema genera automáticamente una alerta para el profesor asignado y despacha un correo electrónico al docente en **5 minutos o menos** (SQAP: **RNF-01**, Decisión **D7**).
2. **CA 2 (Histéresis / Sin Repetición):** Dado una alerta ya enviada previamente en el trimestre, cuando el promedio del estudiante continúa por debajo de 51 con registros posteriores, **la alerta NO se vuelve a repetir** hasta que el estudiante supere formalmente el mínimo ($\ge 51$) y vuelva a caer.

---

### 3.2 Endpoints a Implementar en NestJS (`api/src/modules/notificaciones/`)

#### A. Listar Alertas de Promedio Bajo del Docente

- **Método:** `GET`
- **Ruta:** `/api/notificaciones/alertas?materiaId=:materiaId`
- **Seguridad:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('PROFESOR', 'ADMINISTRADOR')`
- **Respuesta Exitosa (200 OK):**

```json
[
  {
    "id": 101,
    "estudianteId": 1,
    "estudianteNombre": "Mamani Ramos, Alejandro",
    "codigoRude": "80980001",
    "ci": "10203040",
    "materiaId": 7,
    "materiaNombre": "Matemática",
    "cursoId": 1,
    "cursoNombre": "Secundaria 4.º «A»",
    "trimestreId": 1,
    "trimestreNumero": 1,
    "promedioAnterior": 62,
    "promedioNuevo": 45,
    "fechaAlerta": "2026-11-01T10:00:00Z",
    "estado": "ACTIVA",
    "leida": false,
    "correoEnviado": true,
    "fechaEnvioCorreo": "2026-11-01T10:02:15Z",
    "tutor": {
      "id": 20,
      "nombre": "Elena Ramos Condori",
      "parentesco": "Madre",
      "telefono": "71234567",
      "email": "elena.ramos@gmail.com"
    }
  }
]
```

---

#### B. Marcar Alerta como Leída

- **Método:** `PATCH`
- **Ruta:** `/api/notificaciones/alertas/:id/leer`
- **Seguridad:** `@Roles('PROFESOR')`
- **Respuesta:** 204 No Content.

---

#### C. Registrar Atención de la Alerta (Contacto con Tutor)

- **Método:** `POST`
- **Ruta:** `/api/notificaciones/alertas/:id/atender`
- **Seguridad:** `@Roles('PROFESOR')`
- **Cuerpo (DTO):**

```json
{
  "notaAtencion": "Llamada telefónica realizada con la madre; se coordinó apoyo escolar."
}
```

- **Respuesta Exitosa (200 OK):**

```json
{
  "exito": true,
  "mensaje": "La alerta fue marcada como atendida. Se registró el seguimiento con el tutor."
}
```

---

### 3.3 Reglas de Negocio Clave para Lujan (US-08)

1. **Trigger de Detección:**
   - En el servicio de notas (`NotasService` o evento de dominio `NotaRegistradaEvent`), tras llamar a `CalculoService.recalcularNotaTrimestral`:
   - Evaluar si `promedioAnterior >= 51` (o nulo) y `promedioNuevo < 51`.
   - Si se cumple la condición y no existe una alerta con `estado = 'ACTIVA'` para esa tripleta `(estudiante_id, materia_id, trimestre_id)`, crear el registro en la tabla `alerta_promedio_bajo`.
2. **Despacho Asíncrono de Correo (RNF-01):**
   - El correo no debe bloquear la petición HTTP del profesor al guardar notas.
   - Enviar a la cola BullMQ (`notificaciones-correo`) o invocar el proveedor HTTP configurado.
   - Guardar `correoEnviado = true` y la marca temporal `fechaEnvioCorreo`.
3. **Integración con Tutores (US-20):**
   - El endpoint debe hacer un JOIN con `vinculos_familiares` y `padres` para inyectar en la alerta el nombre, teléfono y correo del tutor asignado.

---

### 3.4 Estado de la Capa Frontend (Galvan)

- **Módulo frontend:** `web/src/lib/alertas.ts` (lógica de transición e histéresis CA 1 y CA 2, filtros y llamadas API).
- **Pruebas unitarias:** `web/src/lib/alertas.test.ts` (10 pruebas cubriendo CA 1, CA 2, histéresis, recuperación y filtros al 100 %).
- **Pantalla:** `web/src/pages/profesor/AlertasPromedio.tsx` (registrada en `/profesor/alertas` y accesible desde el menú del docente).
- **Pruebas de interfaz:** `web/src/pages/profesor/profesor.test.tsx` (4 nuevas pruebas automatizadas para CA 1, atención y filtrado).
