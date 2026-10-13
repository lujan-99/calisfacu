#!/usr/bin/env bash
# Smoke test después de un despliegue (SQAP, Sección 6.2: verificación posterior).
# Uso: scripts/smoke.sh <url-api> <commit-esperado>
# Espera hasta 10 minutos a que la API responda con el commit esperado (Render tarda en construir y despertar).
set -euo pipefail
API_URL="${1:?Falta la URL de la API}"
ESPERADO="${2:?Falta el commit esperado}"
LIMITE=$((SECONDS + 600))

while (( SECONDS < LIMITE )); do
  if respuesta=$(curl -fsS --max-time 20 "${API_URL%/}/api/salud" 2>/dev/null); then
    version=$(echo "$respuesta" | jq -r '.version')
    estado=$(echo "$respuesta" | jq -r '.estado')
    if [[ "$estado" == "ok" && "$version" == "$ESPERADO" ]]; then
      echo "Smoke test OK: estado=$estado version=$version"
      exit 0
    fi
    echo "Aún no: estado=$estado version=$version (esperado $ESPERADO)"
  else
    echo "La API todavía no responde"
  fi
  sleep 15
done

echo "Smoke test FALLÓ: la API no respondió con el commit $ESPERADO en 10 minutos" >&2
exit 1
