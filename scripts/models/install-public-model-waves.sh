#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS_BIN="${BELLAS_ARTES_MODEL_TOOLS_BIN:-/home/finvecito/.cache/bellas-artes-model-tools/bin}"
PRIMARY_VAULT="${BELLAS_ARTES_MODEL_VAULT:-/mnt/cesar/BellasArtes_ModelVault}"
SECONDARY_VAULT="${BELLAS_ARTES_MODEL_VAULT_SECONDARY:-/mnt/disco_500gb/BellasArtes_ModelVault}"

export PATH="${TOOLS_BIN}:${PATH}"
cd "${REPO_DIR}"

require_mount() {
  local mount_path="$1"
  if ! mountpoint -q -- "${mount_path}"; then
    echo "El vault requiere el punto de montaje activo: ${mount_path}" >&2
    exit 1
  fi
}

require_mount "/mnt/cesar"
require_mount "/mnt/disco_500gb"

failures=0

run_wave() {
  if ! python scripts/models/install-model-vault.py "$@"; then
    failures=1
    echo "Wave completed with blocked models; continuing with the remaining queue."
  fi
}

run_wave --root "${PRIMARY_VAULT}" \
  --model rvc \
  --model liveportrait-no-insightface \
  --model f5-tts-official \
  --model cmu-openpose \
  --model insightface-models

run_wave --root "${PRIMARY_VAULT}" \
  --model flux2-klein-4b \
  --model pixart-sigma \
  --model z-image \
  --model wan22-ti2v-5b \
  --model qwen-image

run_wave --root "${SECONDARY_VAULT}" \
  --model hunyuan-video-15-83b \
  --model hunyuan-video-original

run_wave --root "${PRIMARY_VAULT}" \
  --model juggernaut-xl \
  --model dynavision-xl \
  --model wai-ani-ponyxl

if [[ -n "${HF_TOKEN:-}" ]]; then
  run_wave --root "${PRIMARY_VAULT}" \
    --model flux-schnell \
    --model sd35-medium \
    --model flux-dev \
    --model flux2-klein-9b
else
  echo "Gated wave deferred: configure a rotated HF_TOKEN and rerun this script."
fi

if [[ "${failures}" -ne 0 ]]; then
  echo "Installation queue finished with blocked models; inspect the manifests before retrying."
fi

# A blocked gated/research source is an expected terminal state for this public
# queue. Exit cleanly so systemd does not loop forever over permanent gates.
exit 0
