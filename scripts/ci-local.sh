#!/usr/bin/env bash
# Ejecuta en local las mismas etapas de prueba del Jenkinsfile (contingencia del riesgo R04).
# Requiere: npm ci hecho y PostgreSQL de docker-compose.yml levantado (npm run db:up).
set -euo pipefail
export DATABASE_URL="${DATABASE_URL:-postgresql://calis:calis@localhost:5432/calis_ci}"

echo "== Lint (M16)"
npx eslint . --max-warnings=0
npx prettier --check .

echo "== Pruebas API (M01, M06, M09, M15): unitarias + e2e; Jest reinicia y migra la base"
npm run -w api test:cov

echo "== Pruebas web"
npm run -w web test -- --run

echo "== Dependencias (M08)"
npm audit --audit-level=high
npx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD"

echo "== Build"
npm run build
echo "Todas las etapas en verde. Adjuntar este log al PR si Jenkins no está disponible."
