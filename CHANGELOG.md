# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/) y versionado semántico
(MAYOR.MENOR.PARCHE). Se actualiza en el PR de cada release (`develop → main`).

## [Sin publicar]

### Cambiado

- Se trabaja directo en `develop`; la revisión de código pasa a ser revisión de commits y `main` sigue protegida por el
  PR de release (ADR-0008, SQAP v1.1). El hook pre-push corre todas las pruebas unitarias de la API y la web.
- Reglas abiertas resueltas: escala de 1 a 100 sin 0, redondeo 0,5 hacia arriba, nota anual como promedio, dimensión
  sin notas = pendiente, licencias cuentan como asistencia, riesgo con asistencia < 80 %, avisos en el sistema y por
  correo (D1 a D7).
- PostgreSQL de desarrollo en el puerto 55432; las pruebas crean `calis_test` si no existe.

### Corregido

- Dos correcciones simultáneas de la misma nota dejaban un historial de auditoría incoherente (US-04, M15).
- El login revelaba qué correos existen (por el mensaje de cuenta bloqueada y por el tiempo de respuesta) y el bloqueo
  tras 5 intentos se podía saltar con peticiones en paralelo (US-17).
- La base admitía la nota 0 aunque la API la rechaza.
- `migration:generate` borraba las restricciones CHECK porque no estaban declaradas en las entidades; una prueba e2e
  comprueba ahora que entidades y migraciones coinciden.
- La CLI de migraciones y el seed no leían `api/.env`.
- La aprobación de producción en Jenkins no impedía que aprobara quien creó la etiqueta.
- La prueba de restauración del respaldo no corría sola el día 5.

### Agregado

- Repositorio base: monorepo `api` (NestJS + TypeORM + PostgreSQL), `web` (React + Vite), `e2e` (Cypress), `perf` (JMeter).
- Autenticación con JWT, roles y bloqueo tras 5 intentos fallidos (US-17).
- Modelo de datos completo con migraciones y auditoría de solo inserción (US-01, US-04, US-18, US-19, US-20).
- Registro de actividades y de planillas en una sola transacción (US-01).
- Cálculo de la nota trimestral según la RM 001/2026 con aritmética decimal (US-02).
- Corrección auditable de notas e historial (US-04).
- Planilla de notas en la web.
- Jenkinsfile Multibranch, imagen de Jenkins, respaldo diario cifrado, hooks de Husky y commitlint.
- Documentación: SQAP v1.0, SRS, SAD, ADR, historias, backlog, guías de desarrollo.
