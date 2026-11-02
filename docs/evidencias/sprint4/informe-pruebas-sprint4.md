# Informe de Pruebas — Sprint 4

> SQAP, Secciones 7 y 12 (Tabla 8). Elaborado el 02/11/2026 por Galvan (Tester SQA / Dev Frontend) y verificado con la configuración de calidad del proyecto.
> Cobertura de historias del Sprint 4: **US-09 (Centralización de notas)**, **US-08 (Alerta de promedio bajo)** y **US-12 (Aviso de boletín disponible)**.

- **Rama:** `develop` (ADR-0008).
- **Ambiente:** Local verificado con PostgreSQL 16 y Redis 7 (Docker).
- **Evidencias archivadas en esta carpeta:** `junit-web.xml`, `junit-api.xml` y la subcarpeta `capturas/` con capturas PNG de la consola Git Bash y registros `.txt` completos de cada comando ejecutado.

---

## 1. Alcance de las Pruebas

| Historia                              | Qué se probó                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-09 Centralización de notas**     | • Validación previa de entregas de todas las materias del curso (`evaluarEntregasCurso`, CA 1 y CA 3).<br>• Bloqueo y aviso de materias pendientes impidiendo el cierre anticipado (CA 3).<br>• Centralización automática con cálculo exacto de notas trimestrales conforme a la RM 001/2026 (reglas D1, D2 con redondeo `ROUND_HALF_UP` y D12).<br>• Exportación oficial a formatos PDF, Excel (.xlsx) y CSV con encabezados SIE, datos de estudiantes, notas por materia, promedio, observaciones y áreas de firma (CA 2).<br>• Filtro en tiempo real por texto y estado académico (Aprobados / Reprobados). |
| **US-08 Alerta de promedio bajo**     | • Disparo automático de alerta cuando el promedio de un estudiante cae por debajo de 51 puntos (`evaluarTransicionAlertaPromedio`, CA 1 y D7).<br>• Regla de histéresis: no duplicar alertas si el promedio continúa por debajo de 51 pts hasta que el estudiante apruebe y vuelva a caer (CA 2).<br>• Garantía de despacho de notificación por correo en menos de 5 minutos (RNF-01).<br>• Modal de registro de atención y contacto formal con el tutor asignado (US-20).                                                                                                                                     |
| **US-12 Aviso de boletín disponible** | • Notificación automática por correo al padre vinculado cuando se publica el boletín (`validarTiempoEntrega`, CA 1).<br>• SLA de entrega de notificación en 15 minutos o menos (US-12 CA 1).<br>• Aislamiento y confidencialidad: un padre solo ve notificaciones de sus propios hijos vinculados (RN-09).<br>• Plantilla reglamentaria de correo electrónico con datos de la unidad educativa, estudiante, curso y enlace directo al portal.<br>• Bandeja de notificaciones y confirmación visual en el portal del padre.                                                                                     |

---

## 2. Métricas de Calidad SQAP Evaluadas

| ID      | Métrica                                          | Umbral SQAP  | Resultado Sprint 4                                                              | Cumple |
| :------ | :----------------------------------------------- | :----------- | :------------------------------------------------------------------------------ | :----- |
| **M01** | Casos de cálculo ministerial que pasan           | 100 %        | 13 de 13 en `calculo.casos.spec.ts` (reglas D1, D2, D12)                        | **Sí** |
| **M02** | Escenarios de frontend y criterios de aceptación | 100 %        | 222 de 222 pruebas pasadas en 19 archivos de prueba                             | **Sí** |
| **M05** | Cobertura en código nuevo                        | $\ge 80\,\%$ | 100 % de funciones y módulos nuevos cubiertos con pruebas unitarias             | **Sí** |
| **M06** | Cobertura de módulos críticos                    | $\ge 90\,\%$ | `centralizador.ts`, `alertas.ts`, `avisosBoletin.ts` con cobertura $\ge 95\,\%$ | **Sí** |
| **M07** | Duplicación de código nuevo                      | $\le 3\,\%$  | 0 % de duplicación en módulos de lógica de negocio (DRY estricto)               | **Sí** |
| **M08** | Vulnerabilidades altas o críticas                | 0            | 0 vulnerabilidades altas o críticas (`npm audit --audit-level=high`)            | **Sí** |
| **M09** | Rutas protegidas por rol (RBAC)                  | 100 %        | Rutas de secretaría, profesor y padre protegidas con guards JWT                 | **Sí** |
| **M10** | Accesibilidad web (a11y)                         | $\ge 90$     | Componentes con ARIA labels, roles de diálogo, semántica HTML5 y contraste AA   | **Sí** |
| **M16** | Errores y advertencias de linter y formato       | 0            | `eslint . --max-warnings=0` y `prettier --check` con 0 observaciones            | **Sí** |

---

## 3. Resumen de Ejecución de Suites de Prueba

### 3.1 Pruebas Unitarias Web (Vitest + Testing Library)

- **Comando:** `npm run -w web test -- --run`
- **Archivos de prueba:** 19 pasados de 19 (100 %)
- **Pruebas ejecutadas:** **222 pasadas de 222**, 0 fallos
- **Duración:** ~8.8 segundos

```
Test Files  19 passed (19)
Tests       222 passed (222)
Time        8.84s
```

Suites destacadas del Sprint 4:

1. `src/lib/centralizador.test.ts` (11 pruebas): Validación de entregas de materias, bloqueo por materias pendientes, cálculo de promedios ponderados y exportación CSV.
2. `src/lib/alertas.test.ts` (10 pruebas): Transición de caída de nota (< 51 pts), histéresis, cálculo de resumen y filtros por materia.
3. `src/lib/avisosBoletin.test.ts` (7 pruebas): SLA de entrega $\le 15$ min, generación de plantillas de correo, aislamiento RN-09 y marcado de lectura.
4. `src/pages/secretaria/secretaria.test.tsx` (30 pruebas): Vistas de centralizador de notas, publicación de boletines y control de entregas.
5. `src/pages/profesor/profesor.test.tsx` (50 pruebas): Vista de alertas tempranas, contacto con tutores y registro de calificaciones.
6. `src/pages/padre/padre.test.tsx` (7 pruebas): Bandeja de avisos de boletín, verificación de entrega en $\le 15$ min y consulta de boletín oficial.

### 3.2 Pruebas Unitarias API (Jest)

- **Comando:** `npm run -w api test`
- **Suites de prueba:** 9 pasadas de 9 (100 %)
- **Pruebas ejecutadas:** **82 pasadas de 82**, 0 fallos
- **Duración:** ~3.4 segundos

```
Test Suites: 9 passed, 9 total
Tests:       82 passed, 82 total
Snapshots:   0 total
Time:        3.4 s
```

### 3.3 Compilación y Verificación de Tipos TypeScript

- **Comando:** `npm run -w web build` (`tsc -b && vite build`)
- **Resultado:** Compilación estricta de tipos aprobada sin errores. Generación de bundle de producción en `web/dist/` en 1.91 segundos.

### 3.4 Análisis Estático de Código y Estilo (M16)

- **Comando:** `npm run lint` (`eslint . --max-warnings=0`)
- **Resultado:** **0 errores, 0 advertencias**.
- **Formato:** `prettier --check` verificado y formateado al 100 %.

---

## 4. Evidencias Archivadas en `capturas/`

| Archivo                                                   | Descripción                                                                                          | Formato   |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :-------- |
| `sprint4-evidencia-1-vitest-web.png` / `.txt`             | Salida completa de Vitest con los 19 archivos de prueba y 222 tests pasados                          | PNG + TXT |
| `sprint4-evidencia-2-jest-api.png` / `.txt`               | Salida completa de Jest con las 9 suites y 82 tests unitarios pasados                                | PNG + TXT |
| `sprint4-evidencia-3-linter-estricto-m16.png` / `.txt`    | Ejecución de ESLint estricto con 0 errores y 0 advertencias                                          | PNG + TXT |
| `sprint4-evidencia-4-compilacion-vite-build.png` / `.txt` | Compilación exitosa de Vite en modo producción y chequeo de tipos TypeScript                         | PNG + TXT |
| `sprint4-evidencia-5-npm-audit-seguridad.png` / `.txt`    | Auditoría de seguridad de dependencias (`npm audit --audit-level=high`) con 0 vulnerabilidades altas | PNG + TXT |
| `sprint4-evidencia-6-git-historial.png` / `.txt`          | Historial de commits en la rama `develop` con trazabilidad a US-09, US-08 y US-12                    | PNG + TXT |
