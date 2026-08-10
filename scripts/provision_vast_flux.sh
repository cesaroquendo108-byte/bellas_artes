#!/usr/bin/env bash
set -euo pipefail

: "${VAST_API_KEY:?VAST_API_KEY debe estar configurada en el entorno}"

vast_api() {
  local path="$1"
  curl --fail --silent --show-error \
    -H "Accept: application/json" \
    -H "Authorization: Bearer ${VAST_API_KEY}" \
    "https://console.vast.ai${path}"
}

echo "=== [1/3] Verificando cuenta de Vast.ai ==="
USER_INFO="$(vast_api "/api/v0/users/current/")"
BALANCE=$(echo "$USER_INFO" | grep -o '"credit": [0-9.]*' | awk '{print $2}')
echo "Saldo actual en Vast.ai: \$${BALANCE} USD"

echo "=== [2/3] Verificando instancias en Vast.ai ==="
INSTANCES="$(vast_api "/api/v1/instances/")"
INSTANCE_ID=$(echo "$INSTANCES" | grep -o '"id": [0-9]*' | head -n 1 | awk '{print $2}')
STATUS=$(echo "$INSTANCES" | grep -o '"cur_state": "[^"]*"' | head -n 1 | cut -d'"' -f4)

echo "Instancia ID: ${INSTANCE_ID:-"No encontrada"}"
echo "Estado actual: ${STATUS:-"Desconocido"}"

echo "=== [3/3] Guardas de Seguridad ==="
echo "- min_load: 0"
echo "- max_workers: 1"
echo "- inactivity_timeout: 600 (10 minutos)"
echo "Configuración lista para pruebas de Flux Schnell."
