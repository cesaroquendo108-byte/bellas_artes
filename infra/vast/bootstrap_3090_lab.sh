#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

LAB_ROOT="${BA_LAB_ROOT:-/workspace/bellas-artes-lab}"
COMFY_ROOT="${COMFYUI_ROOT:-$LAB_ROOT/ComfyUI}"
BA_REPO_REF="${BA_REPO_REF:-077ec399eee2735d47a76e757a4d5451774410de}"
RAW_BASE="${BA_REPO_RAW_BASE:-https://raw.githubusercontent.com/cesaroquendo108-byte/bellas_artes/${BA_REPO_REF}}"
COMFY_COMMIT="a7365071e47175fb06572d0a56d1bf4116c2f581"
LOG_PATH="$LAB_ROOT/bootstrap.log"
STATUS_PATH="$LAB_ROOT/status.json"
LOCK_PATH="$LAB_ROOT/bootstrap.lock"

mkdir -p "$LAB_ROOT"
touch "$LOG_PATH"
exec > >(tee -a "$LOG_PATH") 2>&1

write_status() {
  local state="$1"
  local message="$2"
  local gpu_name="unknown"
  local gpu_vram_mb="0"

  if command -v nvidia-smi >/dev/null 2>&1; then
    gpu_name="$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1 | tr -d '\r')"
    gpu_vram_mb="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -n 1 | tr -d '\r ')"
  fi

  python3 - "$STATUS_PATH" "$state" "$message" "$gpu_name" "$gpu_vram_mb" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

path, state, message, gpu_name, gpu_vram_mb = sys.argv[1:]
payload = {
    "schemaVersion": 1,
    "state": state,
    "message": message,
    "updatedAt": datetime.now(timezone.utc).isoformat(),
    "gpu": {"name": gpu_name, "vramMb": int(gpu_vram_mb or 0)},
    "profile": "public-image-core",
    "models": ["flux-schnell", "flux2-klein-4b", "z-image", "sdxl-base-refiner", "real-esrgan"],
    "comfyPort": 18188,
}
Path(path).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY
}

fail() {
  local code="$?"
  trap - ERR
  write_status "failed" "El bootstrap falló; revisa bootstrap.log."
  exit "$code"
}
trap fail ERR

download() {
  local url="$1"
  local destination="$2"

  mkdir -p "$(dirname "$destination")"
  if [[ -s "$destination" ]]; then
    printf 'Ya existe: %s\n' "$destination"
    return
  fi

  printf 'Descargando %s\n' "$(basename "$destination")"
  curl --fail --location --retry 5 --retry-all-errors --continue-at - \
    --output "$destination.partial" "$url"
  mv "$destination.partial" "$destination"
}

download_verified() {
  local url="$1"
  local destination="$2"
  local expected_sha256="$3"

  mkdir -p "$(dirname "$destination")"
  if [[ -s "$destination" ]]; then
    printf '%s  %s\n' "$expected_sha256" "$destination" | sha256sum -c -
    printf 'Ya existe y pasó SHA-256: %s\n' "$destination"
    return
  fi

  printf 'Descargando y verificando %s\n' "$(basename "$destination")"
  curl --fail --location --retry 5 --retry-all-errors --continue-at - \
    --output "$destination.partial" "$url"
  printf '%s  %s\n' "$expected_sha256" "$destination.partial" | sha256sum -c -
  mv "$destination.partial" "$destination"
}

ensure_comfyui() {
  if [[ ! -d "$COMFY_ROOT/.git" ]]; then
    mkdir -p "$(dirname "$COMFY_ROOT")"
    git clone --filter=blob:none --no-checkout https://github.com/Comfy-Org/ComfyUI.git "$COMFY_ROOT"
  fi

  git -C "$COMFY_ROOT" fetch --depth 1 origin "$COMFY_COMMIT"
  git -C "$COMFY_ROOT" checkout --detach "$COMFY_COMMIT"
  python3 -m pip install --disable-pip-version-check --no-input -r "$COMFY_ROOT/requirements.txt"
}

install_models() {
  local flux_schnell="$COMFY_ROOT/models/checkpoints/flux1-schnell-fp8.safetensors"
  download_verified \
    "https://huggingface.co/Comfy-Org/flux1-schnell/resolve/0cb207e7e753453ef479ae266caf7c1ab364e363/flux1-schnell-fp8.safetensors?download=true" \
    "$flux_schnell" \
    "ead426278b49030e9da5df862994f25ce94ab2ee4df38b556ddddb3db093bf72"
  [[ "$(stat -c '%s' "$flux_schnell")" == "17236328572" ]]

  download_verified \
    "https://huggingface.co/black-forest-labs/FLUX.2-klein-4B/resolve/e7b7dc27f91deacad38e78976d1f2b499d76a294/flux-2-klein-4b.safetensors" \
    "$COMFY_ROOT/models/diffusion_models/flux-2-klein-4b.safetensors" \
    "ec3d4e733a771f61c052fb4856c48b336c55eaf2c65487c2a1faeb9bbda7a343"
  download_verified \
    "https://huggingface.co/black-forest-labs/FLUX.2-klein-base-4b-fp8/resolve/42a82b867533f06de33de3c955a8b6a30c7feebc/flux-2-klein-base-4b-fp8.safetensors" \
    "$COMFY_ROOT/models/diffusion_models/flux-2-klein-base-4b-fp8.safetensors" \
    "44bab3a86fe98b85d21dd2a4729ebdc3ae51fb8a39f76e457e18c724219e6840"
  download_verified \
    "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/429cce00bd1829a3dfd6c57c3204772542876215/split_files/text_encoders/qwen_3_4b.safetensors" \
    "$COMFY_ROOT/models/text_encoders/qwen_3_4b.safetensors" \
    "6c671498573ac2f7a5501502ccce8d2b08ea6ca2f661c458e708f36b36edfc5a"
  download_verified \
    "https://huggingface.co/Comfy-Org/flux2-dev/resolve/ca4ac7c84eb42f3200fffc85b5fbee67129e6ffa/split_files/vae/flux2-vae.safetensors" \
    "$COMFY_ROOT/models/vae/flux2-vae.safetensors" \
    "d64f3a68e1cc4f9f4e29b6e0da38a0204fe9a49f2d4053f0ec1fa1ca02f9c4b5"
  download_verified \
    "https://huggingface.co/black-forest-labs/FLUX.2-small-decoder/resolve/a3efc24f613ef42d9428af62fdbd6f5fd8856c4a/full_encoder_small_decoder.safetensors" \
    "$COMFY_ROOT/models/vae/full_encoder_small_decoder.safetensors" \
    "ea4273f02d1fafbf8e1d1c2cf6018ed8748652eb0bf34f2dd91171f16f15ab62"
  download_verified \
    "https://huggingface.co/Comfy-Org/z_image/resolve/b4924d676513e728754668e1813533deabb0c44a/split_files/diffusion_models/z_image_bf16.safetensors" \
    "$COMFY_ROOT/models/diffusion_models/z_image_bf16.safetensors" \
    "996a67d3ff666946b1c25cbc16d1b1918b6cc0ac166309e23fe3b3d830263dee"
  download_verified \
    "https://huggingface.co/Comfy-Org/z_image/resolve/b4924d676513e728754668e1813533deabb0c44a/split_files/vae/ae.safetensors" \
    "$COMFY_ROOT/models/vae/ae.safetensors" \
    "afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38"
  download_verified \
    "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/7fe97f7c04f42eeb76cdc313dee014dc41d0dff5/sd_xl_base_1.0.safetensors?download=true" \
    "$COMFY_ROOT/models/checkpoints/sd_xl_base_1.0.safetensors" \
    "31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b"
  download_verified \
    "https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/de759911a90edadf11e4ee4b844de666892edd46/sd_xl_refiner_1.0.safetensors?download=true" \
    "$COMFY_ROOT/models/checkpoints/sd_xl_refiner_1.0.safetensors" \
    "7440042bbdc8a24813002c09b6b69b64dc90fded4472613437b7f55f9b7d9c5f"
  download_verified \
    "https://huggingface.co/Comfy-Org/Real-ESRGAN_repackaged/resolve/612512c/RealESRGAN_x4plus.safetensors" \
    "$COMFY_ROOT/models/upscale_models/RealESRGAN_x4plus.safetensors" \
    "37f9a931c215f040aa6d50f711f2cb115f713c46df1d0d6469a8bd7bfe9a60bb"
}

install_workflows() {
  local workflow_dir="$COMFY_ROOT/user/default/workflows/Bellas Artes"
  mkdir -p "$workflow_dir"

  download "$RAW_BASE/workflows/templates/vendor/comfy-org/templates/flux_schnell.json" "$workflow_dir/00-flux-schnell-baseline.json"
  download "$RAW_BASE/workflows/templates/vendor/comfy-org/templates/image_flux2_klein_text_to_image.json" "$workflow_dir/01-flux2-klein-4b-t2i.json"
  download "$RAW_BASE/workflows/templates/vendor/comfy-org/templates/image_flux2_klein_image_edit_4b_base.json" "$workflow_dir/02-flux2-klein-4b-edit.json"
  download "$RAW_BASE/workflows/templates/vendor/comfy-org/templates/image_z_image.json" "$workflow_dir/03-z-image-t2i.json"
  download "$RAW_BASE/workflows/templates/vendor/comfy-org/templates/sdxl_simple_example.json" "$workflow_dir/04-sdxl-base-refiner.json"
  download "$RAW_BASE/workflows/prepared/3090-real-esrgan-image.json" "$workflow_dir/05-real-esrgan-image-upscale.json"
}

start_comfyui() {
  if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:18188/system_stats >/dev/null 2>&1; then
    return
  fi

  nohup python3 "$COMFY_ROOT/main.py" \
    --listen 0.0.0.0 \
    --port 18188 \
    --disable-auto-launch \
    > "$LAB_ROOT/comfyui.log" 2>&1 &

  for _ in $(seq 1 60); do
    if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:18188/system_stats >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done

  return 1
}

main() {
  exec 9>"$LOCK_PATH"
  flock -x -w 1800 9
  write_status "preparing" "Preparando ComfyUI y modelos públicos para la sesión 3090."

  ensure_comfyui
  install_models
  install_workflows
  start_comfyui

  write_status "ready" "ComfyUI está listo con seis workflows de imagen para la sesión administrativa."
  printf 'Bellas Artes 3090 lab listo en http://127.0.0.1:18188\n'
}

main "$@"
