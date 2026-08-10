import type { GenerationProviderKind } from "./config";

export type WorkflowBindingSource =
  | { type: "request"; path: string }
  | { type: "asset"; role: "source" | "reference"; index: number }
  | { type: "computed"; value: "image-width" | "image-height" };

export interface WorkflowBinding {
  nodeId: string;
  input: string;
  source: WorkflowBindingSource;
  required?: boolean;
}

export interface WorkflowManifest {
  version: string;
  kind: GenerationProviderKind;
  operation?: string;
  bindings: WorkflowBinding[];
  limits: {
    maxWidth?: number;
    maxHeight?: number;
    maxDurationSeconds?: number;
    maxFrames?: number;
    timeoutSeconds: number;
    estimatedBudgetUsd?: number;
    minimumVramGb?: number;
  };
  assetInputs?: Array<{
    role: "source" | "reference";
    index: number;
    required?: boolean;
    mimeTypes: string[];
    maxDurationSeconds?: number;
  }>;
  inputMimeTypes?: string[];
  outputMimeTypes: string[];
}

const fluxSchnellManifest: WorkflowManifest = {
  version: "image/flux-schnell-v1",
  kind: "image",
  bindings: [
    { nodeId: "6", input: "text", source: { type: "request", path: "prompt" }, required: true },
    { nodeId: "7", input: "text", source: { type: "request", path: "negativePrompt" } },
    { nodeId: "3", input: "seed", source: { type: "request", path: "seed" } },
    { nodeId: "3", input: "steps", source: { type: "request", path: "steps" } },
    { nodeId: "3", input: "cfg", source: { type: "request", path: "cfgScale" } },
    { nodeId: "5", input: "width", source: { type: "computed", value: "image-width" } },
    { nodeId: "5", input: "height", source: { type: "computed", value: "image-height" } },
  ],
  limits: { maxWidth: 2048, maxHeight: 2048, timeoutSeconds: 600, estimatedBudgetUsd: 0.10, minimumVramGb: 24 },
  outputMimeTypes: ["image/png", "image/jpeg", "image/webp"],
};

const imageReferenceBindings: WorkflowBinding[] = [
  { nodeId: "prompt", input: "text", source: { type: "request", path: "prompt" }, required: true },
  { nodeId: "reference", input: "url", source: { type: "asset", role: "reference", index: 0 } },
  { nodeId: "pose", input: "url", source: { type: "asset", role: "reference", index: 1 } },
  { nodeId: "mask", input: "url", source: { type: "asset", role: "reference", index: 2 } },
  { nodeId: "sampler", input: "seed", source: { type: "request", path: "seed" } },
  { nodeId: "sampler", input: "steps", source: { type: "request", path: "steps" } },
  { nodeId: "sampler", input: "cfg", source: { type: "request", path: "cfgScale" } },
  { nodeId: "face_lock", input: "weight", source: { type: "request", path: "faceWeight" } },
];

const manifests: Record<string, WorkflowManifest> = {
  [fluxSchnellManifest.version]: fluxSchnellManifest,
  "image/flux-dev-v1": {
    ...fluxSchnellManifest,
    version: "image/flux-dev-v1",
    limits: { ...fluxSchnellManifest.limits, timeoutSeconds: 900, estimatedBudgetUsd: 0.20, minimumVramGb: 48 },
  },
  "characters/flux-reference-v1": {
    version: "characters/flux-reference-v1",
    kind: "character",
    bindings: imageReferenceBindings,
    limits: { maxWidth: 2048, maxHeight: 2048, timeoutSeconds: 900, estimatedBudgetUsd: 0.20, minimumVramGb: 24 },
    assetInputs: [0, 1, 2].map((index) => ({ role: "reference" as const, index, mimeTypes: ["image/png", "image/jpeg", "image/webp"] })),
    inputMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    outputMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  "worlds/flux-world-v1": {
    version: "worlds/flux-world-v1",
    kind: "world",
    bindings: imageReferenceBindings.filter((binding) => binding.nodeId !== "face_lock"),
    limits: { maxWidth: 2048, maxHeight: 2048, timeoutSeconds: 900, estimatedBudgetUsd: 0.20, minimumVramGb: 24 },
    assetInputs: [0, 1, 2].map((index) => ({ role: "reference" as const, index, mimeTypes: ["image/png", "image/jpeg", "image/webp"] })),
    inputMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    outputMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  "characters/liveportrait-v1": {
    version: "characters/liveportrait-v1",
    kind: "character",
    operation: "liveportrait",
    bindings: [
      { nodeId: "portrait", input: "url", source: { type: "asset", role: "source", index: 0 }, required: true },
      { nodeId: "driving", input: "url", source: { type: "asset", role: "source", index: 1 }, required: true },
    ],
    limits: { maxWidth: 1024, maxHeight: 1024, maxDurationSeconds: 15, maxFrames: 450, timeoutSeconds: 900, minimumVramGb: 24 },
    assetInputs: [
      { role: "source", index: 0, required: true, mimeTypes: ["image/png", "image/jpeg", "image/webp"] },
      { role: "source", index: 1, required: true, mimeTypes: ["video/mp4", "video/webm"], maxDurationSeconds: 15 },
    ],
    inputMimeTypes: ["image/png", "image/jpeg", "video/mp4", "video/webm"],
    outputMimeTypes: ["video/mp4", "video/webm"],
  },
  "audio/f5-tts-es-v1": {
    version: "audio/f5-tts-es-v1",
    kind: "audio",
    operation: "tts",
    bindings: [
      { nodeId: "text", input: "text", source: { type: "request", path: "text" }, required: true },
      { nodeId: "reference_audio", input: "url", source: { type: "asset", role: "reference", index: 0 } },
      { nodeId: "voice", input: "language", source: { type: "request", path: "language" } },
    ],
    limits: { maxDurationSeconds: 120, timeoutSeconds: 600, estimatedBudgetUsd: 0.10, minimumVramGb: 16 },
    assetInputs: [{ role: "reference", index: 0, mimeTypes: ["audio/wav", "audio/mpeg", "audio/flac", "audio/ogg"], maxDurationSeconds: 30 }],
    inputMimeTypes: ["audio/wav", "audio/mpeg", "audio/flac", "audio/ogg"],
    outputMimeTypes: ["audio/wav", "audio/mpeg"],
  },
  "audio/rvc-v1": {
    version: "audio/rvc-v1",
    kind: "audio",
    operation: "voice-changer",
    bindings: [
      { nodeId: "source_audio", input: "url", source: { type: "asset", role: "source", index: 0 }, required: true },
      { nodeId: "voice_model", input: "id", source: { type: "request", path: "voiceId" }, required: true },
      { nodeId: "pitch", input: "semitones", source: { type: "request", path: "pitch" } },
    ],
    limits: { maxDurationSeconds: 300, timeoutSeconds: 900, estimatedBudgetUsd: 0.10, minimumVramGb: 16 },
    assetInputs: [{ role: "source", index: 0, required: true, mimeTypes: ["audio/wav", "audio/mpeg", "audio/flac", "audio/ogg"], maxDurationSeconds: 300 }],
    inputMimeTypes: ["audio/wav", "audio/mpeg", "audio/flac", "audio/ogg"],
    outputMimeTypes: ["audio/wav", "audio/mpeg"],
  },
};

for (const model of ["hunyuan-8.3b", "hunyuan-13b"] as const) {
  for (const operation of ["t2v", "i2v", "v2v", "action-sync", "effects", "upscale", "lip-sync", "replace-character", "extend"] as const) {
    const version = `video/${model}-${operation}-v1`;
    const premium = model === "hunyuan-13b";
    const sourceRequired = operation !== "t2v";
    const sourceMimeTypes = operation === "i2v"
      ? ["image/png", "image/jpeg", "image/webp"]
      : operation === "effects" || operation === "action-sync"
        ? ["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"]
        : ["video/mp4", "video/webm"];
    const referenceRequired = operation === "action-sync" || operation === "replace-character";
    manifests[version] = {
      version,
      kind: "video",
      operation,
      bindings: [
        { nodeId: "prompt", input: "text", source: { type: "request", path: "prompt" }, ...(operation === "t2v" ? { required: true } : {}) },
        { nodeId: "negative", input: "text", source: { type: "request", path: "negativePrompt" } },
        ...(sourceRequired ? [{ nodeId: "source", input: "url", source: { type: "asset", role: "source", index: 0 }, required: true } as WorkflowBinding] : []),
        ...(["action-sync", "replace-character"].includes(operation)
          ? [{ nodeId: "reference", input: "url", source: { type: "asset", role: "reference", index: 0 }, required: true } as WorkflowBinding]
          : []),
        ...(operation === "lip-sync"
          ? [
              { nodeId: "audio", input: "url", source: { type: "asset", role: "reference", index: 0 } as const },
              { nodeId: "tts", input: "text", source: { type: "request", path: "prompt" } as const },
            ]
          : []),
        { nodeId: "sampler", input: "seed", source: { type: "request", path: "parameters.seed" } },
        { nodeId: "video", input: "duration", source: { type: "request", path: "parameters.duration" } },
        { nodeId: "video", input: "frames", source: { type: "request", path: "parameters.frames" } },
      ],
      limits: {
        maxWidth: premium ? 1920 : 1280,
        maxHeight: premium ? 1080 : 720,
        maxDurationSeconds: premium ? 15 : 10,
        maxFrames: premium ? 450 : 300,
        timeoutSeconds: premium ? 1800 : 1200,
        estimatedBudgetUsd: premium ? 1.5 : 0.75,
        minimumVramGb: premium ? 80 : 48,
      },
      assetInputs: [
        ...(sourceRequired ? [{ role: "source" as const, index: 0, required: true, mimeTypes: sourceMimeTypes, maxDurationSeconds: 15 }] : []),
        ...(referenceRequired ? [{ role: "reference" as const, index: 0, required: true, mimeTypes: ["image/png", "image/jpeg", "image/webp"] }] : []),
        ...(operation === "lip-sync" ? [{ role: "reference" as const, index: 0, mimeTypes: ["audio/wav", "audio/mpeg", "audio/ogg"], maxDurationSeconds: 15 }] : []),
      ],
      inputMimeTypes: ["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm", "audio/wav", "audio/mpeg"],
      outputMimeTypes: ["video/mp4", "video/webm"],
    };
  }
}

export function loadWorkflowManifest(workflowVersion: string) {
  const manifest = manifests[workflowVersion];
  if (!manifest) throw new Error(`Falta el manifiesto de ${workflowVersion}.`);
  return structuredClone(manifest);
}

export function hasWorkflowManifest(workflowVersion: string) {
  return Boolean(manifests[workflowVersion]);
}

export function bindWorkflow(input: {
  workflow: Record<string, unknown>;
  manifest: WorkflowManifest;
  request: Record<string, unknown>;
  sourceUrls?: string[];
  referenceUrls: string[];
}) {
  const graph = structuredClone(input.workflow);
  for (const binding of input.manifest.bindings) {
    const value = resolveBindingValue(binding.source, input.request, input.sourceUrls ?? [], input.referenceUrls, input.manifest);
    if (value === undefined || value === null || value === "") {
      if (binding.required) throw new Error(`Falta el binding requerido ${binding.nodeId}.${binding.input}.`);
      continue;
    }
    const node = graph[binding.nodeId];
    if (!node || typeof node !== "object") throw new Error(`Falta el nodo ${binding.nodeId} de ${input.manifest.version}.`);
    const inputs = (node as { inputs?: unknown }).inputs;
    if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) throw new Error(`El nodo ${binding.nodeId} no tiene inputs válidos.`);
    (inputs as Record<string, unknown>)[binding.input] = value;
  }
  return graph;
}

export function validateWorkflowGraph(workflowVersion: string, workflow: Record<string, unknown>) {
  const manifest = loadWorkflowManifest(workflowVersion);
  for (const binding of manifest.bindings) {
    const node = workflow[binding.nodeId];
    if (!node || typeof node !== "object") return false;
    const inputs = (node as { inputs?: unknown }).inputs;
    if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) return false;
  }
  return true;
}

export function validateWorkflowAssets(
  manifest: WorkflowManifest,
  input: Array<{ mime_type?: string | null; metadata?: unknown }> | {
    source: Array<{ mime_type?: string | null; metadata?: unknown }>;
    reference: Array<{ mime_type?: string | null; metadata?: unknown }>;
  },
) {
  const groups = Array.isArray(input) ? { source: [], reference: input } : input;
  if (manifest.assetInputs?.length) {
    for (const requirement of manifest.assetInputs) {
      const asset = groups[requirement.role][requirement.index];
      if (!asset) {
        if (requirement.required) throw new Error(`Falta el asset ${requirement.role}[${requirement.index}] para ${manifest.version}.`);
        continue;
      }
      validateAsset(asset, requirement.mimeTypes, requirement.maxDurationSeconds ?? manifest.limits.maxDurationSeconds, manifest.version);
    }
    return;
  }
  for (const asset of [...groups.source, ...groups.reference]) {
    validateAsset(asset, manifest.inputMimeTypes, manifest.limits.maxDurationSeconds, manifest.version);
  }
}

export function validateWorkflowRequest(manifest: WorkflowManifest, request: Record<string, unknown>) {
  const parameters = request.parameters && typeof request.parameters === "object" && !Array.isArray(request.parameters)
    ? request.parameters as Record<string, unknown>
    : {};
  const width = firstFiniteNumber(request.width, parameters.width);
  const height = firstFiniteNumber(request.height, parameters.height);
  const duration = firstFiniteNumber(parameters.duration, parameters.durationSeconds, parameters.extensionSeconds);
  const frames = firstFiniteNumber(parameters.frames, parameters.frameCount);
  if (width !== null && manifest.limits.maxWidth && width > manifest.limits.maxWidth) throw new Error("La anchura excede el límite del workflow.");
  if (height !== null && manifest.limits.maxHeight && height > manifest.limits.maxHeight) throw new Error("La altura excede el límite del workflow.");
  if (duration !== null && manifest.limits.maxDurationSeconds && duration > manifest.limits.maxDurationSeconds) throw new Error("La duración excede el límite del workflow.");
  if (frames !== null && manifest.limits.maxFrames && frames > manifest.limits.maxFrames) throw new Error("La cantidad de frames excede el límite del workflow.");
}

function resolveBindingValue(source: WorkflowBindingSource, request: Record<string, unknown>, sourceUrls: string[], referenceUrls: string[], manifest: WorkflowManifest) {
  if (source.type === "request") return getPath(request, source.path);
  if (source.type === "asset") return source.role === "source" ? sourceUrls[source.index] : referenceUrls[source.index];
  const dimensions = resolveImageDimensions(request, manifest);
  return source.value === "image-width" ? dimensions.width : dimensions.height;
}

function validateAsset(
  asset: { mime_type?: string | null; metadata?: unknown },
  allowedMimeTypes: string[] | undefined,
  maxDurationSeconds: number | undefined,
  workflowVersion: string,
) {
  if (allowedMimeTypes?.length && (!asset.mime_type || !allowedMimeTypes.includes(asset.mime_type))) {
    throw new Error(`MIME no permitido para ${workflowVersion}.`);
  }
  const durationSeconds = readDurationSeconds(asset.metadata);
  if (durationSeconds !== null && maxDurationSeconds && durationSeconds > maxDurationSeconds) {
    throw new Error(`El asset excede la duración máxima de ${workflowVersion}.`);
  }
}

function getPath(value: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function resolveImageDimensions(request: Record<string, unknown>, manifest: WorkflowManifest) {
  const explicitWidth = Number(request.width);
  const explicitHeight = Number(request.height);
  if (Number.isInteger(explicitWidth) && explicitWidth > 0 && Number.isInteger(explicitHeight) && explicitHeight > 0) {
    return clampDimensions(explicitWidth, explicitHeight, manifest);
  }
  const edge = request.resolution === "2k" ? 2048 : 1024;
  const ratio = typeof request.aspectRatio === "string" ? request.aspectRatio : "1:1";
  const [widthRatio, heightRatio] = ratio.split(":").map(Number);
  if (!widthRatio || !heightRatio) return clampDimensions(edge, edge, manifest);
  return widthRatio >= heightRatio
    ? clampDimensions(edge, Math.round((edge * heightRatio / widthRatio) / 64) * 64, manifest)
    : clampDimensions(Math.round((edge * widthRatio / heightRatio) / 64) * 64, edge, manifest);
}

function clampDimensions(width: number, height: number, manifest: WorkflowManifest) {
  return {
    width: Math.min(width, manifest.limits.maxWidth ?? width),
    height: Math.min(height, manifest.limits.maxHeight ?? height),
  };
}

function readDurationSeconds(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = metadata as Record<string, unknown>;
  const seconds = Number(value.durationSeconds ?? value.duration_seconds);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const milliseconds = Number(value.durationMs ?? value.duration_ms);
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? milliseconds / 1000 : null;
}

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}
