# Acta de revisión de seguridad contra el OWASP Top 10: Sprint 3

> SQAP, Sección 7.2: "revisión manual contra el OWASP Top 10 en la auditoría de la semana 3". Combina un análisis
> dinámico automático (OWASP ZAP contra staging) con la revisión del código y pruebas manuales de lo que ZAP no puede
> juzgar (reglas de negocio de acceso a datos de menores).

- **Fecha:** 30/10/2026 · **Revisa:** Lujan · **Debe auditar:** Galvan (independencia, SQAP Sección 3; pendiente)
- **Versión revisada:** develop `c1ff200` (antes de las correcciones) y `6ba9d85` (después)
- **Ambiente:** staging en Render (API `calisfacu-api-staging`, web `calisfacu-web-staging`), datos sintéticos
- **Herramientas:** OWASP ZAP `stable` (`zap-baseline.py` sobre la web; `zap-api-scan.py` con la especificación OpenAPI
  de 54 rutas), curl, Chromium (puppeteer) y la suite de Jest

## 1. Análisis dinámico (OWASP ZAP)

| Objetivo | Script            | Antes de corregir          | Después de corregir |
| -------- | ----------------- | -------------------------- | ------------------- |
| Web      | `zap-baseline.py` | 0 FAIL · 7 WARN · 54 PASS  | ver sección 5       |
| API      | `zap-api-scan.py` | 0 FAIL · 5 WARN · 115 PASS | ver sección 5       |

Advertencias de la API antes de corregir: sin `X-Content-Type-Options`, sin HSTS, `X-Powered-By: Express` (13 URL),
sin `Cross-Origin-Resource-Policy` y "Unexpected Content-Type" (42 URL: respuestas 401 en JSON a un escaneo sin sesión,
comportamiento esperado). En la web: sin CSP, sin protección contra clickjacking, sin SRI en la hoja de Google Fonts y
tres avisos informativos de caché.

## 2. Revisión por categoría

| Categoría OWASP 2021                   | Qué se revisó                                                                                                                                                                                                                            | Resultado                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| A01 Control de acceso roto             | Guard global con JWT y `@Roles`; asignación profesor–materia; vínculo padre–estudiante. En staging: padre con un ID ajeno → 403; profesor sin la materia → 403; padre que encola boletines → 403. Suite `autorizacion.e2e-spec.ts` (M09) | Cumple                      |
| A02 Fallas criptográficas              | Contraseñas con argon2; JWT firmado con `JWT_SECRET` generado por Render; HTTPS con HSTS; respaldos cifrados con AES-256                                                                                                                 | Cumple                      |
| A03 Inyección                          | Consultas con QueryBuilder o parámetros `$1`; `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`; React escapa la salida; importación Excel validada por fila (D14)                                                               | Cumple                      |
| A04 Diseño inseguro                    | Bloqueo de 15 min tras 5 intentos por cuenta, en una sentencia atómica; sin límite de peticiones por IP (H3)                                                                                                                             | Parcial (H3)                |
| A05 Mala configuración de seguridad    | API sin cabeceras y con `X-Powered-By` (H1); web sin CSP ni anti-clickjacking (H2); CORS con lista de orígenes; Swagger solo fuera de producción; errores sin trazas                                                                     | Cumple tras corregir H1, H2 |
| A06 Componentes vulnerables            | `npm audit --audit-level=high` en cada build (0 altas, M08); Dependabot activo desde el 30/10; SonarQube Cloud                                                                                                                           | Cumple                      |
| A07 Fallas de identificación           | Tiempo constante si el correo no existe; token de 30 min; la renovación vuelve a leer la cuenta; token alterado → 401                                                                                                                    | Parcial (H3)                |
| A08 Integridad de software y datos     | `npm ci` con lockfile; pipeline como código; la imagen comprueba sus dependencias (CAL-001); Google Fonts sin SRI (H5)                                                                                                                   | Cumple (H5 aceptado)        |
| A09 Fallas de registro y monitoreo     | Auditoría de solo inserción de cada cambio de nota (M15); UptimeRobot cada 5 min; los intentos fallidos se cuentan por cuenta, pero no generan alerta                                                                                    | Cumple (observación)        |
| A10 Falsificación de peticiones (SSRF) | La API no hace peticiones a URL que envíe el usuario                                                                                                                                                                                     | No aplica                   |

## 3. Hallazgos

| N.º | Categoría | Descripción                                                                  | Severidad | Estado                                                                                                           |
| --- | --------- | ---------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| H1  | A05       | La API no enviaba cabeceras de seguridad y anunciaba `X-Powered-By: Express` | Media     | Corregido: `ff7cd22` y `6ba9d85` (helmet; 5 pruebas en `app.setup.spec.ts`)                                      |
| H2  | A05       | La web no tenía CSP ni protección contra clickjacking                        | Media     | Corregido: `9a070b0` (`render.yaml`); verificado con Chromium sin violaciones de CSP                             |
| H3  | A04, A07  | El inicio de sesión no limita peticiones por IP                              | Media     | Abierto: CAL-003 (#74), Sprint 4                                                                                 |
| H4  | A05       | Los mensajes de validación salen en inglés                                   | Baja      | Abierto: CAL-004 (#75)                                                                                           |
| H5  | A08       | La hoja de Google Fonts se carga sin SRI                                     | Baja      | Aceptado: Google cambia el CSS por navegador y SRI lo rompería; la CSP limita el origen a `fonts.googleapis.com` |

## 4. Decisión

- [ ] Sin hallazgos
- [x] **Con hallazgos medios o bajos que no bloquean el cierre:** H1 y H2 corregidos con prueba; H3 y H4 registrados
      como defectos con prioridad; H5 aceptado con justificación.

## 5. Verificación después de corregir

Se completa con el despliegue de `6ba9d85` en staging (build de Jenkins de develop) y una nueva ejecución de ZAP.

## 6. Firmas

| Nombre | Rol          | Firma |
| ------ | ------------ | ----- |
| Lujan  | Revisa       |       |
| Galvan | Audita (SQA) |       |
