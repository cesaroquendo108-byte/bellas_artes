/**
 * NodeWatch: Motor de Auditoría y Gobernanza de Dependencias de ComfyUI.
 *
 * Basado en la auditoría de la comunidad de r/ComfyUI (98 de los 300 paquetes más populares
 * sin commits en más de 12 meses, afectando a más de 22.6 millones de descargas).
 *
 * Previene el "workflow rot" asegurando que los flujos de Bellas Artes utilicen
 * nodos nativos del núcleo de ComfyUI y suites mantenidas activamente, eliminando
 * dependencias abandonadas o absorbidas por el núcleo.
 */

export type NodeCategory =
  | "core"
  | "verified_active"
  | "stale_risk"
  | "abandoned_danger"
  | "absorbed_obsolete";

export type AuditStatus = "HEALTHY" | "CAUTION" | "CRITICAL_ROT";

export interface NodeMetadata {
  classType: string;
  category: NodeCategory;
  packName?: string;
  repository?: string;
  lastCommitDaysApprox?: number;
  recommendation?: string;
  nativeReplacement?: string;
}

export interface NodeAuditItem {
  nodeId: string;
  classType: string;
  category: NodeCategory;
  packName?: string;
  recommendation?: string;
  nativeReplacement?: string;
}

export interface NodeAuditReport {
  status: AuditStatus;
  healthScore: number; // 0 - 100
  totalNodes: number;
  uniqueClassTypes: number;
  breakdown: Record<NodeCategory, number>;
  flaggedNodes: NodeAuditItem[];
  summary: string;
}

/**
 * Catálogo curado de nodos conocidos en el ecosistema ComfyUI.
 */
export const KNOWN_NODES_CATALOG: Record<string, Omit<NodeMetadata, "classType">> = {
  // ComfyUI Native Core Nodes (Categoría: core)
  LoadImage: { category: "core", packName: "ComfyUI-Core" },
  SaveImage: { category: "core", packName: "ComfyUI-Core" },
  SaveVideo: { category: "core", packName: "ComfyUI-Core" },
  CreateVideo: { category: "core", packName: "ComfyUI-Core" },
  VAEDecode: { category: "core", packName: "ComfyUI-Core" },
  VAEEncode: { category: "core", packName: "ComfyUI-Core" },
  VAEDecodeAudio: { category: "core", packName: "ComfyUI-Core" },
  UNETLoader: { category: "core", packName: "ComfyUI-Core" },
  CLIPLoader: { category: "core", packName: "ComfyUI-Core" },
  VAELoader: { category: "core", packName: "ComfyUI-Core" },
  CheckpointLoaderSimple: { category: "core", packName: "ComfyUI-Core" },
  LoraLoaderModelOnly: { category: "core", packName: "ComfyUI-Core" },
  KSampler: { category: "core", packName: "ComfyUI-Core" },
  KSamplerSelect: { category: "core", packName: "ComfyUI-Core" },
  SamplerCustomAdvanced: { category: "core", packName: "ComfyUI-Core" },
  RandomNoise: { category: "core", packName: "ComfyUI-Core" },
  BasicGuider: { category: "core", packName: "ComfyUI-Core" },
  BasicScheduler: { category: "core", packName: "ComfyUI-Core" },
  CLIPTextEncode: { category: "core", packName: "ComfyUI-Core" },
  ConditioningCombine: { category: "core", packName: "ComfyUI-Core" },
  ConditioningAverage: { category: "core", packName: "ComfyUI-Core" },
  EmptyLatentImage: { category: "core", packName: "ComfyUI-Core" },
  LatentUpscale: { category: "core", packName: "ComfyUI-Core" },
  ImageScale: { category: "core", packName: "ComfyUI-Core" },
  MaskComposite: { category: "core", packName: "ComfyUI-Core" },
  PreviewImage: { category: "core", packName: "ComfyUI-Core" },
  PrimitiveStringMultiline: { category: "core", packName: "ComfyUI-Core" },
  PrimitiveFloat: { category: "core", packName: "ComfyUI-Core" },
  PrimitiveBoolean: { category: "core", packName: "ComfyUI-Core" },
  ModelAttentionBackend: { category: "core", packName: "ComfyUI-Core" },
  BlockSparseAttention: { category: "core", packName: "ComfyUI-Core" },

  // Verified Active Extensions (Mantenidas y soportadas)
  VHS_LoadVideo: { category: "verified_active", packName: "ComfyUI-VideoHelperSuite", repository: "Kosinkadink/ComfyUI-VideoHelperSuite" },
  VHS_VideoCombine: { category: "verified_active", packName: "ComfyUI-VideoHelperSuite", repository: "Kosinkadink/ComfyUI-VideoHelperSuite" },
  VHS_LoadVideoPath: { category: "verified_active", packName: "ComfyUI-VideoHelperSuite", repository: "Kosinkadink/ComfyUI-VideoHelperSuite" },
  SCAIL2_Recast: { category: "verified_active", packName: "ComfyUI-SCAIL2", repository: "zai-org/ComfyUI-SCAIL2" },
  SAM3_Multiplex: { category: "verified_active", packName: "ComfyUI-SAM3", repository: "facebookresearch/sam3" },
  MiniMaxH3ReferenceToVideo: { category: "verified_active", packName: "ComfyUI-MiniMax-H3", repository: "Comfy-Org/MiniMax_H3_repackaged" },
  MiniMaxH3SigmaShift: { category: "verified_active", packName: "ComfyUI-MiniMax-H3", repository: "Comfy-Org/MiniMax_H3_repackaged" },
  WanVideoModelLoader: { category: "verified_active", packName: "ComfyUI-WanVideo", repository: "Kijai/ComfyUI-WanVideo" },

  // Absorbed / Obsolete (Absorbidos por el núcleo o reemplazables directamente)
  CR_ImageInputSwitch: {
    category: "absorbed_obsolete",
    packName: "ComfyUI_Comfyroll_CustomNodes",
    lastCommitDaysApprox: 420,
    recommendation: "Reemplazar por switch nativo de ComfyUI Core v0.3+.",
    nativeReplacement: "ComfyUI Native Primitive Switch",
  },
  CR_Aspect_Ratio: {
    category: "absorbed_obsolete",
    packName: "ComfyUI_Comfyroll_CustomNodes",
    lastCommitDaysApprox: 420,
    recommendation: "Reemplazar por nodo nativo ResolutionSelector o EmptyLatentImage con valores estándar.",
    nativeReplacement: "ResolutionSelector",
  },
  ComfyMathExpression: {
    category: "stale_risk",
    packName: "pythongosssss/ComfyUI-Custom-Scripts",
    lastCommitDaysApprox: 210,
    recommendation: "Evaluar sustitución por primitivas numéricas estándar si no se requiere lógica compleja.",
    nativeReplacement: "PrimitiveFloat / PrimitiveInt",
  },
  ResolutionSelector: {
    category: "verified_active",
    packName: "ComfyUI-Essentials",
    repository: "cubiq/ComfyUI_essentials",
  },

  // Abandoned Danger Nodes (Top paquetes abandonados con >365 días sin commits)
  Was_Image_Save: {
    category: "abandoned_danger",
    packName: "WAS-Node-Suite",
    lastCommitDaysApprox: 450,
    recommendation: "Peligro de rotura: WAS Node Suite está desatendido. Usar SaveImage nativo.",
    nativeReplacement: "SaveImage",
  },
  ImpactWildcardProcessor: {
    category: "stale_risk",
    packName: "ComfyUI-Impact-Pack",
    lastCommitDaysApprox: 260,
    recommendation: "Supervisar compatibilidad con ComfyUI v0.4+.",
  },
  Efficiency_Loader: {
    category: "abandoned_danger",
    packName: "efficiency-nodes-comfyui",
    lastCommitDaysApprox: 540,
    recommendation: "Paquete abandonado con incompatibilidades severas en nuevos loaders UNET. Usar loaders nativos separados.",
    nativeReplacement: "UNETLoader + CLIPLoader + VAELoader",
  },
  UltimateSDUpscale: {
    category: "stale_risk",
    packName: "ComfyUI_UltimateSDUpscale",
    lastCommitDaysApprox: 340,
    recommendation: "Precaución: verificar con tensores de escala moderna o usar Tile Upscale nativo.",
  },
};

/**
 * Clasifica un tipo de nodo según el registro de NodeWatch.
 */
export function classifyNode(classType: string): NodeMetadata {
  const hit = KNOWN_NODES_CATALOG[classType];
  if (hit) {
    return {
      classType,
      ...hit,
    };
  }

  // Heurísticas automáticas para clasificar nodos no registrados:
  if (
    classType.startsWith("Save") ||
    classType.startsWith("Load") ||
    classType.startsWith("VAE") ||
    classType.startsWith("CLIP") ||
    classType.startsWith("KSampler") ||
    classType.startsWith("Conditioning") ||
    classType.startsWith("EmptyLatent") ||
    classType.startsWith("Basic") ||
    classType.startsWith("Sampler") ||
    classType.startsWith("Random")
  ) {
    return {
      classType,
      category: "core",
      packName: "ComfyUI-Core (Inferred)",
    };
  }

  if (classType.startsWith("VHS_") || classType.startsWith("WanVideo_") || classType.startsWith("SAM3_")) {
    return {
      classType,
      category: "verified_active",
      packName: "Verified Community Pack",
    };
  }

  // Por defecto, nodo externo no catalogado: se marca en riesgo de estancamiento
  return {
    classType,
    category: "stale_risk",
    packName: "Unknown External Pack",
    recommendation: "Nodo no verificado en el catálogo fiduciario. Validar commits y compatibilidad antes de desplegar en producción.",
  };
}

/**
 * Audita un grafo completo de ComfyUI (formato API JSON).
 */
export function auditWorkflowGraph(
  workflow: Record<string, { class_type?: string; [key: string]: unknown }>,
): NodeAuditReport {
  const breakdown: Record<NodeCategory, number> = {
    core: 0,
    verified_active: 0,
    stale_risk: 0,
    abandoned_danger: 0,
    absorbed_obsolete: 0,
  };

  const flaggedNodes: NodeAuditItem[] = [];
  const uniqueClasses = new Set<string>();
  let totalNodes = 0;

  for (const [nodeId, nodeData] of Object.entries(workflow)) {
    const classType = nodeData.class_type;
    if (!classType) continue;

    totalNodes++;
    uniqueClasses.add(classType);

    const classification = classifyNode(classType);
    breakdown[classification.category]++;

    if (
      classification.category === "abandoned_danger" ||
      classification.category === "absorbed_obsolete" ||
      classification.category === "stale_risk"
    ) {
      flaggedNodes.push({
        nodeId,
        classType,
        category: classification.category,
        packName: classification.packName,
        recommendation: classification.recommendation,
        nativeReplacement: classification.nativeReplacement,
      });
    }
  }

  // Cálculo de puntaje de salud (Health Score 0-100)
  // Base 100:
  // - Cada nodo 'core': 0 penalización
  // - Cada nodo 'verified_active': 0 penalización
  // - Cada nodo 'stale_risk': -5 penalización
  // - Cada nodo 'absorbed_obsolete': -15 penalización
  // - Cada nodo 'abandoned_danger': -30 penalización
  let penalty = 0;
  if (totalNodes > 0) {
    penalty += breakdown.stale_risk * 5;
    penalty += breakdown.absorbed_obsolete * 15;
    penalty += breakdown.abandoned_danger * 30;
  }

  const healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  let status: AuditStatus = "HEALTHY";
  if (breakdown.abandoned_danger > 0 || healthScore < 50) {
    status = "CRITICAL_ROT";
  } else if (breakdown.stale_risk > 0 || breakdown.absorbed_obsolete > 0 || healthScore < 85) {
    status = "CAUTION";
  }

  const summary =
    status === "HEALTHY"
      ? `Flujo robusto (${healthScore}/100). Utiliza un ${Math.round(((breakdown.core + breakdown.verified_active) / (totalNodes || 1)) * 100)}% de nodos nativos/verificados sin dependencias obsoletas.`
      : status === "CAUTION"
      ? `Precaución (${healthScore}/100): Se detectaron ${breakdown.stale_risk + breakdown.absorbed_obsolete} nodos con riesgo de obsolescencia o alternativas nativas disponibles.`
      : `Peligro de rotura (${healthScore}/100): Flujo dependiente de ${breakdown.abandoned_danger} nodos abandonados o sin mantenimiento en >12 meses. Requiere refactorización a nodos nativos.`;

  return {
    status,
    healthScore,
    totalNodes,
    uniqueClassTypes: uniqueClasses.size,
    breakdown,
    flaggedNodes,
    summary,
  };
}

/**
 * Parsea y audita una cadena JSON de workflow.
 */
export function auditWorkflowJson(jsonString: string): NodeAuditReport {
  try {
    const parsed = JSON.parse(jsonString) as Record<string, { class_type?: string }>;
    return auditWorkflowGraph(parsed);
  } catch (error) {
    throw new Error(
      `Error de sintaxis JSON al auditar el workflow: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
