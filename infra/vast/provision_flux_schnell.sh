#!/usr/bin/env bash
set -euo pipefail

readonly model_name="flux1-schnell-fp8.safetensors"
readonly expected_size="17236328572"
readonly expected_sha256="ead426278b49030e9da5df862994f25ce94ab2ee4df38b556ddddb3db093bf72"
readonly model_url="https://huggingface.co/Comfy-Org/flux1-schnell/resolve/0cb207e7e753453ef479ae266caf7c1ab364e363/${model_name}?download=true"
readonly workspace="${WORKSPACE:-/workspace}"
readonly checkpoint_dir="${workspace}/ComfyUI/models/checkpoints"
readonly model_path="${checkpoint_dir}/${model_name}"
readonly partial_path="${model_path}.part"
readonly checksum_marker="${model_path}.sha256"
readonly lock_path="${model_path}.lock"
readonly benchmark_path="${workspace}/flux-schnell-benchmark.json"
readonly wrapper_dir="/opt/comfyui-api-wrapper"
readonly wrapper_commit="e1d04af1f3bbd2d44c33e0adf419d6ca57dedd88"

mkdir -p "$checkpoint_dir"

assert_persistent_cache_mount() {
  local mount_target
  local mount_fstype
  local mount_source
  mount_target="$(findmnt -T "$checkpoint_dir" -n -o TARGET)"
  mount_fstype="$(findmnt -T "$checkpoint_dir" -n -o FSTYPE)"
  mount_source="$(findmnt -T "$checkpoint_dir" -n -o SOURCE)"

  if [[ -z "$mount_target" || "$mount_target" == "/" || "$mount_fstype" == "overlay" || "$mount_fstype" == "overlayfs" || "$mount_source" == "overlay" ]]; then
    echo "CACHE_VOLUME_NOT_MOUNTED: ${checkpoint_dir} no está sobre un volumen persistente dedicado." >&2
    exit 1
  fi
  if [[ ! -w "$checkpoint_dir" ]]; then
    echo "CACHE_VOLUME_NOT_WRITABLE: ${checkpoint_dir} no es escribible." >&2
    exit 1
  fi
  echo "Caché persistente confirmada en ${mount_target} (${mount_fstype})."
}

pin_api_wrapper() {
  [[ -d "${wrapper_dir}/.git" ]] || {
    echo "No se encontró el repositorio oficial de comfyui-api-wrapper." >&2
    exit 1
  }
  git -C "$wrapper_dir" fetch --quiet --depth=1 origin "$wrapper_commit"
  git -C "$wrapper_dir" checkout --quiet --detach "$wrapper_commit"
  [[ "$(git -C "$wrapper_dir" rev-parse HEAD)" == "$wrapper_commit" ]] || {
    echo "No se pudo fijar la versión de comfyui-api-wrapper." >&2
    exit 1
  }
  echo "comfyui-api-wrapper fijado en ${wrapper_commit}."
}

write_benchmark() {
  local benchmark_tmp="${benchmark_path}.tmp"
  cat > "$benchmark_tmp" <<'JSON'
{
  "4": {"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux1-schnell-fp8.safetensors"}},
  "5": {"class_type":"EmptyLatentImage","inputs":{"width":512,"height":512,"batch_size":1}},
  "6": {"class_type":"CLIPTextEncode","inputs":{"text":"A still life on a wooden table, soft daylight","clip":["4",1]}},
  "7": {"class_type":"CLIPTextEncode","inputs":{"text":"","clip":["4",1]}},
  "3": {"class_type":"KSampler","inputs":{"seed":424242,"steps":4,"cfg":1,"sampler_name":"euler","scheduler":"simple","denoise":1,"model":["4",0],"positive":["6",0],"negative":["7",0],"latent_image":["5",0]}},
  "8": {"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},
  "9": {"class_type":"SaveImage","inputs":{"filename_prefix":"ba_flux_schnell_benchmark","images":["8",0]}}
}
JSON
  mv "$benchmark_tmp" "$benchmark_path"
}

model_is_ready() {
  [[ -f "$model_path" ]] || return 1
  [[ "$(stat -c '%s' "$model_path")" == "$expected_size" ]] || return 1
  [[ -f "$checksum_marker" ]] || return 1
  [[ "$(tr -d '[:space:]' < "$checksum_marker")" == "$expected_sha256" ]]
}

provision_model() {
  if model_is_ready; then
    echo "Flux Schnell cache verificada; descarga omitida."
    return
  fi

  echo "Descargando Flux Schnell FP8 en el volumen persistente."
  curl --fail --location --retry 5 --retry-all-errors --connect-timeout 30 \
    --continue-at - --output "$partial_path" "$model_url"

  local actual_size
  actual_size="$(stat -c '%s' "$partial_path")"
  [[ "$actual_size" == "$expected_size" ]] || {
    echo "Tamaño inválido: ${actual_size}." >&2
    exit 1
  }

  local actual_sha256
  actual_sha256="$(sha256sum "$partial_path" | awk '{print $1}')"
  [[ "$actual_sha256" == "$expected_sha256" ]] || {
    echo "SHA-256 inválido." >&2
    exit 1
  }

  mv "$partial_path" "$model_path"
  printf '%s\n' "$expected_sha256" > "$checksum_marker"
  echo "Flux Schnell FP8 instalado y verificado."
}

write_benchmark
pin_api_wrapper
assert_persistent_cache_mount
(
  flock -x -w 900 9
  provision_model
) 9>"$lock_path"
