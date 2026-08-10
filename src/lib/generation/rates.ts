export const generationCreditRates = {
  image: 1,
  video: 80,
  audio: 0,
  character: 0,
  world: 0,
} as const;

export const creditPackages = {
  curioso: 600,
  creador: 1600,
  estudio: 3500,
} as const;

export type GenerationBillableKind = keyof typeof generationCreditRates;

export const QUALITY_MULTIPLIERS: Record<string, number> = {
  low: 1,
  medium: 6,
  high: 21,
};

export const RESOLUTION_MULTIPLIERS: Record<string, number> = {
  "1k": 1,
  "2k": 1.5,
  "4k": 2,
};

export const MODEL_BASE_COSTS: Record<string, number> = {
  // Imágenes
  "flux-schnell": 1,
  "flux-dev": 8,
  "flux-1-dev": 8,
  "sdxl-turbo": 1,
  "sdxl-lightning": 1,

  // Video
  "hunyuan-video-8.3b": 80,
  "hunyuan-video-13b": 100,
  "mochi": 60,
  "cogvideox": 40,

  // Audio
  "f5-tts": 5,
  "rvc": 8,
  "so-vits-svc": 10,
  "fish-speech": 5,
  "xtts": 4,

  // Characters & Post
  "flux-dev-reference": 15,
  "flux-schnell-reference": 5,
  "real-esrgan": 2,
  "rife": 3,
};

export function getGenerationCreditCost(
  kind: GenerationBillableKind,
  params?: Record<string, unknown>,
  model?: string,
) {
  if (kind === "audio" || kind === "character" || kind === "world") return 0;
  const baseCost = (model && MODEL_BASE_COSTS[model]) || generationCreditRates[kind];

  if (!params) {
    return baseCost;
  }

  // Multiplicadores por calidad y resolución.
  const quality = typeof params.quality === "string" ? params.quality : "low";
  const resolution = typeof params.resolution === "string" ? params.resolution : "1k";
  const imageCount = typeof params.batch_size === "number" ? params.batch_size : 1;

  const qualityMult = QUALITY_MULTIPLIERS[quality] || 1;
  const resMult = RESOLUTION_MULTIPLIERS[resolution] || 1;

  // Sólo aplicamos multiplicadores de calidad/resolución a imagen y vídeo.
  let generationCost = baseCost;
  if (kind === "image" || kind === "video") {
    generationCost = baseCost * qualityMult * resMult * imageCount;
  }

  // Referencias: 3 créditos por referencia plana.
  const referenceCount = Array.isArray(params.references) ? params.references.length : 0;
  const referenceCost = referenceCount * 3;

  return Math.ceil(generationCost + referenceCost);
}
