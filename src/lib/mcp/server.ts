import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { getOwnedGenerationJob } from "@/lib/generation/db";
import { listGenerationCapabilities } from "@/lib/generation/capabilities";
import { resolveImageRoute, resolveVideoRoute } from "@/lib/generation/registry";
import { enqueueGeneration } from "@/lib/generation/service";
import { getPrivateObjectUrl } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  buildFreefieldWorkflow,
  getFreefieldApp,
  listFreefieldApps,
  searchFreefieldApps,
} from "@/lib/freefield/registry";
import { executeFreefieldApp } from "@/lib/freefield/executor";
import {
  composeFromPreset,
  BUILTIN_PRESETS,
} from "@/lib/prompt-composer";
import {
  listModelPacks,
  getModelPack,
  generateProvisioningScript,
  type ModelPackId,
} from "@/lib/generation/model-packs";
import { listPortalStyles } from "@/lib/gesture-portal/styles";
import { auditWorkflowJson } from "@/lib/admin/node-watch";
import { planSupercomputerPipeline } from "@/lib/generation/supercomputer";
import { globalPromptContextMemory, type ModelTarget } from "@/lib/prompt-composer/context-memory";

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

export function createBellasArtesMcpServer(userId: string) {
  const server = new McpServer({ name: "bellas-artes", version: "1.0.0" });
  const capabilities = listGenerationCapabilities();
  const imageConfigured = capabilities.some((capability) => capability.id === "image-flux-schnell" && capability.workflowConfigured);
  const videoConfigured = capabilities.some((capability) => capability.kind === "video" && capability.workflowConfigured);

  if (imageConfigured) server.registerTool("create_image", {
    title: "Create image",
    description: "Encola una generación de imagen open source en Bellas Artes.",
    inputSchema: {
      prompt: z.string().min(1).max(4000),
      model: z.enum(["flux-schnell", "flux-dev"]).default("flux-schnell"),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:5"]).default("1:1"),
      resolution: z.enum(["1k", "2k"]).default("1k"),
      quality: z.enum(["low", "medium", "high"]).default("medium"),
      referenceAssetIds: z.array(z.string().uuid()).max(12).optional(),
    },
  }, async ({ prompt, model, aspectRatio, resolution, quality, referenceAssetIds }) => text(await enqueueGeneration({
    userId,
    kind: "image",
    queueKind: "image",
    route: resolveImageRoute(model),
    request: { mode: "create", prompt, model, autoPolish: true, aspectRatio, resolution, quality, steps: 4, cfgScale: 7, referenceAssetIds },
    assetIds: referenceAssetIds,
  })));

  if (videoConfigured) server.registerTool("create_video", {
    title: "Create video",
    description: "Encola una generación de video HunyuanVideo en Bellas Artes.",
    inputSchema: {
      operation: z.enum(["t2v", "i2v", "v2v", "action-sync", "effects", "upscale", "lip-sync", "replace-character", "extend"]).default("t2v"),
      prompt: z.string().max(4000).optional(),
      model: z.enum(["hunyuan-video-1.5-8.3b", "hunyuan-video-13b"]).default("hunyuan-video-1.5-8.3b"),
      aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3"]).default("16:9"),
      sourceAssetIds: z.array(z.string().uuid()).max(4).optional(),
      referenceAssetIds: z.array(z.string().uuid()).max(8).optional(),
      parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
    },
  }, async ({ operation, prompt, model, aspectRatio, sourceAssetIds, referenceAssetIds, parameters }) => text(await enqueueGeneration({
    userId,
    kind: "video",
    queueKind: "video",
    route: resolveVideoRoute(operation, model),
    request: { operation, prompt, model, aspectRatio, sourceAssetIds, referenceAssetIds, parameters },
    assetIds: [...(sourceAssetIds ?? []), ...(referenceAssetIds ?? [])],
  })));

  server.registerTool("get_generation_job", {
    title: "Get generation job",
    description: "Consulta el estado de un job creado por este usuario MCP.",
    inputSchema: { jobId: z.string().uuid() },
  }, async ({ jobId }) => text(await getOwnedGenerationJob(userId, jobId)));

  server.registerTool("list_recent_assets", {
    title: "List recent assets",
    description: "Lista los assets propios recientes que puede utilizar el agente.",
    inputSchema: { type: z.enum(["image", "video", "audio"]).optional(), limit: z.number().int().min(1).max(30).default(12) },
  }, async ({ type, limit }) => {
    let query = createAdminClient().from("assets").select("id,type,name,mime_type,bytes,metadata,created_at,r2_key").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) return text({ errorCode: "ASSET_LOOKUP_FAILED", message: error.message });
    const assets = await Promise.all((data ?? []).map(async (asset) => ({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      mimeType: asset.mime_type,
      bytes: asset.bytes,
      metadata: asset.metadata,
      createdAt: asset.created_at,
      signedUrl: await getPrivateObjectUrl(asset.r2_key).catch(() => null),
    })));
    return text({ assets });
  });

  server.registerTool("list_freefield_apps", {
    title: "List Freefield apps",
    description: "Lista y busca aplicaciones de Freefield (reconstrucción abierta de Higgsfield sobre ComfyUI).",
    inputSchema: {
      section: z.enum(["image", "video", "audio", "utility"]).optional(),
      query: z.string().optional(),
      limit: z.number().int().min(1).max(120).default(30),
    },
  }, async ({ section, query, limit }) => {
    const apps = query || section ? searchFreefieldApps({ query, section }) : listFreefieldApps();
    const sliced = apps.slice(0, limit).map((app) => ({
      id: app.id,
      name: app.name,
      section: app.section,
      higgsfield_feature: app.higgsfield_feature,
      summary: app.summary,
      pack: app.pack,
      vram: app.vram,
    }));
    return text({ total: apps.length, returned: sliced.length, apps: sliced });
  });

  server.registerTool("get_freefield_app", {
    title: "Get Freefield app details",
    description: "Obtiene los detalles, inputs y modelos requeridos de una aplicación de Freefield.",
    inputSchema: {
      appId: z.string().min(1),
    },
  }, async ({ appId }) => {
    const app = getFreefieldApp(appId);
    if (!app) return text({ errorCode: "FREEFIELD_APP_NOT_FOUND", message: `La app "${appId}" no existe.` });
    const { graph: _, ...details } = app;
    void _;
    return text({ app: details, hasGraph: Boolean(app.graph) });
  });

  server.registerTool("build_freefield_workflow", {
    title: "Build Freefield ComfyUI workflow",
    description: "Valida parámetros y construye el grafo ejecutable de ComfyUI para una app de Freefield.",
    inputSchema: {
      appId: z.string().min(1),
      inputs: z.record(z.string(), z.unknown()),
    },
  }, async ({ appId, inputs }) => {
    try {
      const result = buildFreefieldWorkflow(appId, inputs);
      return text({
        success: true,
        appId,
        appName: result.app.name,
        resolvedValues: result.resolvedValues,
        prompt: result.prompt,
      });
    } catch (error) {
      return text({
        errorCode: "FREEFIELD_BUILD_ERROR",
        message: error instanceof Error ? error.message : "Error al construir el grafo.",
      });
    }
  });

  server.registerTool("execute_freefield_app", {
    title: "Execute Freefield ComfyUI workflow",
    description: "Ejecuta una app de Freefield en ComfyUI (GPU local o remota en Vast.ai), espera los resultados y devuelve los artefactos generados.",
    inputSchema: {
      appId: z.string().min(1),
      inputs: z.record(z.string(), z.unknown()),
      comfyUrl: z.string().url().optional(),
      dryRun: z.boolean().default(false),
      timeoutSeconds: z.number().int().min(10).max(1800).default(900),
    },
  }, async ({ appId, inputs, comfyUrl, dryRun, timeoutSeconds }) => {
    try {
      const result = await executeFreefieldApp(appId, inputs, { comfyUrl, dryRun, timeoutSeconds });
      return text(result);
    } catch (error) {
      return text({
        success: false,
        errorCode: "FREEFIELD_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : "Error durante la ejecución del workflow.",
      });
    }
  });

  server.registerTool("list_prompt_presets", {
    title: "List prompt composer presets",
    description: "Lista los presets disponibles en Prompt Composer (fiduciario, cinematográfico recasting, etc.).",
    inputSchema: {},
  }, async () => {
    return text({
      presets: BUILTIN_PRESETS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sectionCount: p.sections.length,
      })),
    });
  });

  server.registerTool("compose_prompt", {
    title: "Compose prompt",
    description: "Compone un prompt positivo y negativo modular y tipado usando la biblioteca de Prompt Composer.",
    inputSchema: {
      presetId: z.string().optional(),
      basePrompt: z.string().optional(),
      negativePrompt: z.string().optional(),
      seed: z.number().int().optional(),
    },
  }, async ({ presetId, basePrompt, negativePrompt, seed }) => {
    try {
      if (presetId) {
        const result = composeFromPreset(presetId, { basePrompt, negativePrompt, seed });
        return text({ success: true, ...result });
      }
      return text({
        success: false,
        message: "Debe proporcionar un presetId para componer.",
      });
    } catch (error) {
      return text({
        success: false,
        errorCode: "PROMPT_COMPOSE_ERROR",
        message: error instanceof Error ? error.message : "Error al componer el prompt.",
      });
    }
  });

  server.registerTool("list_model_packs", {
    title: "List GPU model packs",
    description: "Lista los paquetes de modelos GPU preconfigurados (Wan SCAIL-2, GesturePortal FLUX, Krea Turbo) y genera el script de aprovisionamiento JIT.",
    inputSchema: {
      packId: z.string().optional(),
      generateScript: z.boolean().default(false),
      modelsDir: z.string().optional(),
    },
  }, async ({ packId, generateScript, modelsDir }) => {
    try {
      if (packId) {
        const pack = getModelPack(packId as ModelPackId);
        if (!pack) {
          return text({ success: false, message: `El paquete "${packId}" no existe.` });
        }
        const script = generateScript ? generateProvisioningScript(packId as ModelPackId, modelsDir) : undefined;
        return text({ success: true, pack, script });
      }
      return text({ success: true, packs: listModelPacks() });
    } catch (error) {
      return text({
        success: false,
        errorCode: "MODEL_PACKS_ERROR",
        message: error instanceof Error ? error.message : "Error al consultar paquetes de modelos.",
      });
    }
  });

  server.registerTool("list_portal_styles", {
    title: "List gesture portal styles",
    description: "Lista los 9 estilos visuales para GesturePortal (cámara web con ComfyUI) y sus parámetros de inferencia.",
    inputSchema: {},
  }, async () => {
    return text({
      styles: listPortalStyles().map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        cfgScale: s.cfgScale,
        denoiseStrength: s.denoiseStrength,
        steps: s.steps,
      })),
    });
  });

  server.registerTool("audit_comfy_workflow_nodes", {
    title: "Audit ComfyUI workflow nodes",
    description:
      "Audita la salud de dependencias de un workflow ComfyUI con NodeWatch. Detecta nodos obsoletos, riesgos de rotura (>12 meses sin commits) y sugiere alternativas nativas del núcleo.",
    inputSchema: {
      workflowJson: z.string().describe("Contenido JSON del flujo ComfyUI en formato API."),
    },
  }, async ({ workflowJson }) => {
    try {
      const report = auditWorkflowJson(workflowJson);
      return text({ success: true, report });
    } catch (error) {
      return text({
        success: false,
        errorCode: "NODE_WATCH_AUDIT_ERROR",
        message: error instanceof Error ? error.message : "Error al auditar el flujo de ComfyUI.",
      });
    }
  });

  server.registerTool("directors_cut_compose_prompt", {
    title: "Compose Director's Cut H3 prompt",
    description:
      "Construye un prompt estructurado fiduciario para MiniMax H3 REF2VA según el estándar de Director's Cut (subject_definitions, summary, retention_analysis, detailed_description, dialogue, soundscape).",
    inputSchema: {
      characterSubject: z.string().describe("Definición de <Subject 1> vinculado a <Picture 1>."),
      wardrobeSubject: z.string().optional().describe("Definición opcional de <Subject 2> (vestuario o coprotagonista)."),
      locationSubject: z.string().optional().describe("Definición opcional de <Subject 3> (locación/fondo)."),
      summary: z.string().describe("Resumen de 1-2 oraciones del plano o escena."),
      detailedDescription: z.string().describe("Descripción de movimiento de cámara, iluminación y acción."),
      dialogue: z.string().optional().describe("Diálogo fonético opcional con formato <d>[Idioma] texto</d>."),
      soundscape: z.string().default("Quiet ambient room tone and realistic foley."),
    },
  }, async ({ characterSubject, wardrobeSubject, locationSubject, summary, detailedDescription, dialogue, soundscape }) => {
    const lines: string[] = ["subject_definitions:"];
    lines.push(`<Subject 1> is ${characterSubject}`);
    if (wardrobeSubject) lines.push(`<Subject 2> is ${wardrobeSubject}`);
    if (locationSubject) lines.push(`<Subject 3> is ${locationSubject}`);
    lines.push("");
    lines.push("summary:");
    lines.push(`[reference generation] ${summary}`);
    lines.push("");
    lines.push("retention_analysis:");
    lines.push("<Subject 1> appears throughout the scene: preserve identity, facial features and proportions.");
    if (wardrobeSubject) lines.push("<Subject 2> appears throughout: preserve clothing, textures and style.");
    if (locationSubject) lines.push("<Subject 3> appears as environment: preserve lighting and architecture.");
    lines.push("");
    lines.push("detailed_description:");
    lines.push(detailedDescription);
    if (dialogue) {
      lines.push(dialogue);
    }
    lines.push("");
    lines.push("overall_soundscape:");
    lines.push(soundscape);
    lines.push("");
    lines.push("non_diegetic_music:");
    lines.push("N/A. No music.");
    lines.push("");

    return text({
      success: true,
      prompt: lines.join("\n"),
    });
  });

  server.registerTool("supercomputer_plan_pipeline", {
    title: "Plan Supercomputer generative pipeline",
    description:
      "Planifica un pipeline audiovisual completo de múltiples tomas con desglose de guion, consistencia de personajes (Director's Cut/Wan SCAIL-2), enrutamiento a Freefield y estimación de coste GPU en Vast.ai.",
    inputSchema: {
      projectId: z.string().describe("Identificador único del proyecto."),
      title: z.string().describe("Título o concepto de la producción."),
      targetDurationSeconds: z.number().int().min(5).max(60).default(15),
      aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      coreMessage: z.string().describe("Tesis o mensaje principal que debe comunicar el video."),
      cast: z.array(z.object({
        handle: z.string().describe("Handle único del personaje, ej. @cesar"),
        name: z.string(),
        roleDescription: z.string(),
      })).optional(),
    },
  }, async ({ projectId, title, targetDurationSeconds, aspectRatio, coreMessage, cast }) => {
    try {
      const plan = planSupercomputerPipeline({
        projectId,
        title,
        targetDurationSeconds,
        aspectRatio,
        coreMessage,
        cast,
      });
      return text({ success: true, plan });
    } catch (error) {
      return text({
        success: false,
        errorCode: "SUPERCOMPUTER_PLAN_ERROR",
        message: error instanceof Error ? error.message : "Error al planificar el pipeline.",
      });
    }
  });

  server.registerTool("goatd_enhance_prompt", {
    title: "Enhance prompt with GOAT'd context memory",
    description:
      "Optimiza y expande un prompt utilizando la memoria contextual multi-turno (GOAT'd) y la sintaxis formal del modelo objetivo (MiniMax H3, Qwen 2.1, Wan 2.1, FLUX).",
    inputSchema: {
      sessionId: z.string().describe("ID de la sesión para preservar memoria conversacional."),
      userPrompt: z.string().describe("Instrucción o prompt base del usuario."),
      modelTarget: z.enum(["minimax-h3", "qwen-2.1", "wan-2.1", "flux-dev", "flux-schnell"]).default("minimax-h3"),
      dialogue: z.string().optional().describe("Diálogo opcional para generar formato <d>[Idioma] texto</d>."),
      subjects: z.record(z.string(), z.string()).optional().describe("Diccionario de sujetos e identidades a preservar."),
    },
  }, async ({ sessionId, userPrompt, modelTarget, dialogue, subjects }) => {
    try {
      const formatted = globalPromptContextMemory.formatWithModelGuide(
        modelTarget as ModelTarget,
        userPrompt,
        { dialogue, subjects },
      );
      const turn = globalPromptContextMemory.recordTurn(sessionId, {
        userInstruction: userPrompt,
        targetModel: modelTarget as ModelTarget,
        generatedPrompt: formatted,
        subjects,
      });
      const contextSummary = globalPromptContextMemory.buildContextSummary(sessionId);

      return text({
        success: true,
        turnId: turn.id,
        enhancedPrompt: formatted,
        estimatedTokens: turn.estimatedTokens,
        contextSummary,
      });
    } catch (error) {
      return text({
        success: false,
        errorCode: "GOATD_ENHANCE_ERROR",
        message: error instanceof Error ? error.message : "Error al enriquecer el prompt.",
      });
    }
  });

  server.registerResource("generation-capabilities", "bellas-artes://capabilities", { mimeType: "application/json" }, async () => ({
    contents: [{
      uri: "bellas-artes://capabilities",
      mimeType: "application/json",
      text: JSON.stringify({
        capabilities: capabilities.map(({ id, label, kind, model, operation, workflowVersion, status }) => ({ id, label, kind, model, operation, workflowVersion, status })),
        jobStatuses: ["queued", "processing", "completed", "failed", "canceled"],
      }),
    }],
  }));

  return server;
}
