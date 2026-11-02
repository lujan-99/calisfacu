# Guía de Integración y Especificación Backend — Sprint 4

> **Documento para:** Lujan (Líder / Arquitecto / Dev Backend)  
> **Elaborado por:** Galvan (Dev Frontend / Tester SQA)  
> **Proyecto:** CalisFacu v1.0 · Sistema Web de Registro de Calificaciones  
> **Normativa:** Resolución Ministerial 001/2026 del Ministerio de Educación (Bolivia)  
> **Sprint:** 4 (Cierre de gestión, centralización y consolidación institucional)  
> **Estado:** US-09 Frontend Finalizado · Esperando Integración Backend

---

## 1. Resumen de Historias del Sprint 4

| Historia  | Título                      | Rol Primario  | Backend (Lujan)  | Frontend (Galvan) | Estado                         |
| :-------- | :-------------------------- | :------------ | :--------------- | :---------------- | :----------------------------- |
| **US-09** | **Centralización de Notas** | Secretaría    | **T-057, T-058** | **T-059**         | Frontend listo · Esperando API |
| **US-08** | Alerta de Promedio Bajo     | Profesor      | T-054, T-055     | T-056             | Planificada                    |
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

### 2.3 Reglas de Negocio Clave para Lujan

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
