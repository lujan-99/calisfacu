# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/) y versionado semántico
(MAYOR.MENOR.PARCHE). Se actualiza en el PR de cada release (`develop → main`).

## [Sin publicar]

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
