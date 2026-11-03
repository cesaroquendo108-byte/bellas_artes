export type ModelPackId =
  | "wan-scail2-recast"
  | "gesture-portal-flux"
  | "krea-turbo-realtime"
  | "freefield-cinema-studio"
  | "openjutsu-h3"
  | "directors-cut-h3-qwen"
  | "zentrainer-flux-lora";

export interface ModelFileEntry {
  filename: string;
  targetSubdir:
    | "checkpoints"
    | "diffusion_models"
    | "unet"
    | "vae"
    | "clip"
    | "loras"
    | "controlnet"
    | "sam3"
    | "text_encoders"
    | "ultralytics"
    | "sams";
  sourceUrl: string;
  sizeGbApprox: number;
  isOptional?: boolean;
}

export interface ModelPack {
  id: ModelPackId;
  name: string;
  description: string;
  vramRequiredGb: number;
  recommendedGpu: string;
  defaultWorkflow: string;
  files: ModelFileEntry[];
}

export const MODEL_PACKS: Record<ModelPackId, ModelPack> = {
  "wan-scail2-recast": {
    id: "wan-scail2-recast",
    name: "Wan 2.1 14B SCAIL-2 Character Recast Pack",
    description:
      "Suite completa para reemplazo de personajes, tracking SAM 3.1 y destilación Lightx2v en 4 pasos con fidelidad cinematográfica.",
    vramRequiredGb: 24,
    recommendedGpu: "RTX 5090 / RTX 4090 / A100",
    defaultWorkflow: "wan2.1_scail2_recast_4step.json",
    files: [
      {
        filename: "Wan2_1-T2V-14B_fp8_e4m3fn.safetensors",
        targetSubdir: "diffusion_models",
        sourceUrl: "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1-T2V-14B_fp8_e4m3fn.safetensors",
        sizeGbApprox: 14.2,
      },
      {
        filename: "Wan2_1_VAE_fp32.safetensors",
        targetSubdir: "vae",
        sourceUrl: "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_fp32.safetensors",
        sizeGbApprox: 1.4,
      },
      {
        filename: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        targetSubdir: "clip",
        sourceUrl: "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        sizeGbApprox: 5.2,
      },
      {
        filename: "wan2.1_lightx2v_4step_lora.safetensors",
        targetSubdir: "loras",
        sourceUrl: "https://huggingface.co/lightx2v/wan2.1-14b-distill/resolve/main/lightx2v_wan2.1_14b_4step.safetensors",
        sizeGbApprox: 0.8,
      },
      {
        filename: "sam3_video_tracker_large.pt",
        targetSubdir: "sam3",
        sourceUrl: "https://huggingface.co/facebook/sam3-video/resolve/main/sam3_large.pt",
        sizeGbApprox: 2.1,
      },
    ],
  },
  "gesture-portal-flux": {
    id: "gesture-portal-flux",
    name: "GesturePortal Real-Time FLUX & Qwen Pack",
    description:
      "Modelos de latencia ultra baja para portal webcam interactivo, estilización en vivo y blending de máscaras suaves con MediaPipe.",
    vramRequiredGb: 16,
    recommendedGpu: "RTX 5090 / RTX 5070 Ti / RTX 4080",
    defaultWorkflow: "gesture_portal_flux2_klein_4step.json",
    files: [
      {
        filename: "flux2_klein_4b_distill_fp8.safetensors",
        targetSubdir: "diffusion_models",
        sourceUrl: "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors",
        sizeGbApprox: 8.9,
      },
      {
        filename: "ae.safetensors",
        targetSubdir: "vae",
        sourceUrl: "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors",
        sizeGbApprox: 0.35,
      },
      {
        filename: "t5xxl_fp8_e4m3fn.safetensors",
        targetSubdir: "clip",
        sourceUrl: "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors",
        sizeGbApprox: 4.8,
      },
      {
        filename: "clip_l.safetensors",
        targetSubdir: "clip",
        sourceUrl: "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors",
        sizeGbApprox: 0.25,
      },
    ],
  },
  "krea-turbo-realtime": {
    id: "krea-turbo-realtime",
    name: "Krea 2 Turbo Real-Time Generation Pack",
    description:
      "Generación y estilizado instantáneo a 1-2 pasos para feedback visual en tiempo real a más de 5 FPS sobre RTX 5090.",
    vramRequiredGb: 12,
    recommendedGpu: "RTX 5090 / RTX 4070",
    defaultWorkflow: "krea_turbo_i2i_stream.json",
    files: [
      {
        filename: "sd_turbo_fp16.safetensors",
        targetSubdir: "checkpoints",
        sourceUrl: "https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors",
        sizeGbApprox: 2.3,
      },
      {
        filename: "taesd.safetensors",
        targetSubdir: "vae",
        sourceUrl: "https://huggingface.co/madebyollin/taesd/resolve/main/diffusion_pytorch_model.safetensors",
        sizeGbApprox: 0.05,
      },
    ],
  },
  "freefield-cinema-studio": {
    id: "freefield-cinema-studio",
    name: "Freefield Cinema Studio Master Pack",
    description:
      "Suite maestra con soporte para los 120 workflows abiertos de Higgsfield, movimientos de cámara y edición cinematográfica.",
    vramRequiredGb: 32,
    recommendedGpu: "RTX 5090 (32GB VRAM)",
    defaultWorkflow: "freefield_cinema_studio_master.json",
    files: [
      {
        filename: "Wan2_1-T2V-14B_fp8_e4m3fn.safetensors",
        targetSubdir: "diffusion_models",
        sourceUrl: "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1-T2V-14B_fp8_e4m3fn.safetensors",
        sizeGbApprox: 14.2,
      },
      {
        filename: "flux1-schnell-fp8.safetensors",
        targetSubdir: "unet",
        sourceUrl: "https://huggingface.co/Kijai/flux-fp8/resolve/main/flux1-schnell-fp8.safetensors",
        sizeGbApprox: 11.9,
      },
      {
        filename: "Wan2_1_VAE_fp32.safetensors",
        targetSubdir: "vae",
        sourceUrl: "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_fp32.safetensors",
        sizeGbApprox: 1.4,
      },
    ],
  },
  "openjutsu-h3": {
    id: "openjutsu-h3",
    name: "Openjutsu MiniMax H3 & Qwen3-VL Character Swap Pack",
    description:
      "Suite completa de Openjutsu con MiniMax H3 int8, Qwen3-VL para visión y autodescripción de prompts, y SAM 3.1 para tracking.",
    vramRequiredGb: 32,
    recommendedGpu: "RTX 5090 (32GB VRAM) / A100",
    defaultWorkflow: "openjutsu_simple_h3.json",
    files: [
      {
        filename: "minimax_h3_ref2va_pruned_int8_convrot.safetensors",
        targetSubdir: "diffusion_models",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/MiniMax_H3_repackaged/resolve/main/minimax_h3_ref2va_pruned_int8_convrot.safetensors",
        sizeGbApprox: 16.5,
      },
      {
        filename: "minimax_h3_video_vae_int8_convrot.safetensors",
        targetSubdir: "vae",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/MiniMax_H3_repackaged/resolve/main/minimax_h3_video_vae_int8_convrot.safetensors",
        sizeGbApprox: 1.5,
      },
      {
        filename: "qwen3vl_8b_int8_convrot.safetensors",
        targetSubdir: "text_encoders",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/Qwen3-VL_repackaged/resolve/main/qwen3vl_8b_int8_convrot.safetensors",
        sizeGbApprox: 8.5,
      },
      {
        filename: "minimax_h3_DMAD_4step_full_lora_avg_rank_39_bf16.safetensors",
        targetSubdir: "loras",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/MiniMax_H3_repackaged/resolve/main/minimax_h3_DMAD_4step_full_lora_avg_rank_39_bf16.safetensors",
        sizeGbApprox: 1.2,
      },
      {
        filename: "sam3.1_multiplex_fp16.safetensors",
        targetSubdir: "checkpoints",
        sourceUrl:
          "https://huggingface.co/facebook/sam3-video/resolve/main/sam3.1_multiplex_fp16.safetensors",
        sizeGbApprox: 2.4,
      },
    ],
  },
  "directors-cut-h3-qwen": {
    id: "directors-cut-h3-qwen",
    name: "Director's Cut FastH3 OmniRef & Qwen 2.1 Pack",
    description:
      "Suite completa de filmmaking de Director's Cut con MiniMax H3 REF2VA 8-step, Qwen-Image 2.1 y Qwen 3.5 prompt enhancer para consistencia fiduciaria de personajes.",
    vramRequiredGb: 32,
    recommendedGpu: "RTX 5090 (32GB VRAM) / A100",
    defaultWorkflow: "FastH3_OmniRef_8step.api.json",
    files: [
      {
        filename: "minimax_h3_ref2va_pruned_int8_convrot.safetensors",
        targetSubdir: "diffusion_models",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/MiniMax_H3_repackaged/resolve/main/minimax_h3_ref2va_pruned_int8_convrot.safetensors",
        sizeGbApprox: 16.5,
      },
      {
        filename: "minimax_h3_video_vae_int8_convrot.safetensors",
        targetSubdir: "vae",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/MiniMax_H3_repackaged/resolve/main/minimax_h3_video_vae_int8_convrot.safetensors",
        sizeGbApprox: 1.5,
      },
      {
        filename: "qwen_image_2.1_bf16.safetensors",
        targetSubdir: "diffusion_models",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_bf16.safetensors",
        sizeGbApprox: 15.4,
      },
      {
        filename: "qwen3.5_9b_qwen_image_2.1_pe_t2i.int8_convrot.safetensors",
        targetSubdir: "text_encoders",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3.5_9b_qwen_image_2.1_pe_t2i.int8_convrot.safetensors",
        sizeGbApprox: 9.2,
      },
      {
        filename: "qwen_image_2.1_vae_bf16.safetensors",
        targetSubdir: "vae",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/vae/qwen_image_2.1_vae_bf16.safetensors",
        sizeGbApprox: 0.5,
      },
    ],
  },
  "zentrainer-flux-lora": {
    id: "zentrainer-flux-lora",
    name: "ZenTrainer FLUX & Qwen LoRA Training Pack",
    description:
      "Suite completa de entrenamiento de LoRAs en ComfyUI con ZenTrainer, soporte para auto-captioning Qwen-VL y cuantizacion int8/fp8.",
    vramRequiredGb: 24,
    recommendedGpu: "RTX 5090 (32GB VRAM) / RTX 4090",
    defaultWorkflow: "zentrainer_flux_lora.api.json",
    files: [
      {
        filename: "flux1-dev-fp8.safetensors",
        targetSubdir: "unet",
        sourceUrl: "https://huggingface.co/Kijai/flux-fp8/resolve/main/flux1-dev-fp8.safetensors",
        sizeGbApprox: 11.9,
      },
      {
        filename: "ae.safetensors",
        targetSubdir: "vae",
        sourceUrl: "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors",
        sizeGbApprox: 0.35,
      },
      {
        filename: "qwen3vl_8b_int8_convrot.safetensors",
        targetSubdir: "text_encoders",
        sourceUrl:
          "https://huggingface.co/Comfy-Org/Qwen3-VL_repackaged/resolve/main/qwen3vl_8b_int8_convrot.safetensors",
        sizeGbApprox: 8.5,
      },
    ],
  },
};

export function listModelPacks(): ModelPack[] {
  return Object.values(MODEL_PACKS);
}

export function getModelPack(id: ModelPackId): ModelPack | undefined {
  return MODEL_PACKS[id];
}

/**
 * Genera un script Bash multihilo optimizado para aprovisionamiento JIT en NVMe.
 * Utiliza hf_hub_download o aria2c/curl con 8 conexiones concurrentes por archivo.
 */
export function generateProvisioningScript(
  packId: ModelPackId,
  comfyModelsDir = "/workspace/ComfyUI/models",
): string {
  const pack = getModelPack(packId);
  if (!pack) {
    throw new Error(`El paquete de modelos "${packId}" no existe.`);
  }

  const lines: string[] = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `echo "=== Aprovisionando Model Pack: ${pack.name} ==="`,
    `MODELS_DIR="${comfyModelsDir}"`,
    "mkdir -p \"$MODELS_DIR\"/{checkpoints,diffusion_models,unet,vae,clip,loras,controlnet,sam3,text_encoders,ultralytics,sams}",
    "",
  ];

  for (const file of pack.files) {
    const dest = `"$MODELS_DIR/${file.targetSubdir}/${file.filename}"`;
    lines.push(
      `if [ ! -f ${dest} ]; then`,
      `  echo "Descargando ${file.filename} (${file.sizeGbApprox} GB)..."`,
      `  if command -v aria2c >/dev/null 2>&1; then`,
      `    aria2c -x 8 -s 8 -k 1M -c -d "$MODELS_DIR/${file.targetSubdir}" -o "${file.filename}" "${file.sourceUrl}"`,
      `  else`,
      `    curl -L -C - --retry 3 -o ${dest} "${file.sourceUrl}"`,
      `  fi`,
      `else`,
      `  echo "Archivo ya existente: ${file.filename}"`,
      `fi`,
      "",
    );
  }

  lines.push(
    `echo "=== Model Pack ${pack.name} aprovisionado correctamente ==="`,
  );

  return lines.join("\n");
}

export function validateModelPackInstallation(
  packId: ModelPackId,
  existingFiles: string[],
): { isComplete: boolean; missingFiles: string[]; installedFiles: string[] } {
  const pack = getModelPack(packId);
  if (!pack) {
    throw new Error(`El paquete de modelos "${packId}" no existe.`);
  }

  const missingFiles: string[] = [];
  const installedFiles: string[] = [];

  for (const file of pack.files) {
    const isPresent = existingFiles.some(
      (f) => f.endsWith(`/${file.filename}`) || f === file.filename,
    );
    if (isPresent) {
      installedFiles.push(file.filename);
    } else if (!file.isOptional) {
      missingFiles.push(file.filename);
    }
  }

  return {
    isComplete: missingFiles.length === 0,
    missingFiles,
    installedFiles,
  };
}
