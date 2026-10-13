#!/usr/bin/env bash
# Espera a que un endpoint de salud responda 200 (etapa Rendimiento del Jenkinsfile).
# Uso: scripts/esperar-salud.sh <url> [segundos]
set -euo pipefail
URL="${1:?Falta la URL}"
LIMITE=$((SECONDS + ${2:-120}))
until curl -fsS --max-time 5 "$URL" > /dev/null 2>&1; do
  if (( SECONDS >= LIMITE )); then
    echo "La API no respondió en $URL" >&2
    exit 1
  fi
  sleep 2
done
echo "API lista en $URL"
