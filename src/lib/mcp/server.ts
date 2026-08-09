import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { getOwnedGenerationJob } from "@/lib/generation/db";
import { resolveImageRoute, resolveVideoRoute } from "@/lib/generation/registry";
import { enqueueGeneration } from "@/lib/generation/service";
import { getPrivateObjectUrl } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

export function createBellasArtesMcpServer(userId: string) {
  const server = new McpServer({ name: "bellas-artes", version: "1.0.0" });

  server.registerTool("create_image", {
    title: "Create image",
    description: "Encola una generación de imagen open source en Bellas Artes.",
    inputSchema: {
      prompt: z.string().min(1).max(4000),
      model: z.string().default("gpt-image-2"),
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

  server.registerTool("create_video", {
    title: "Create video",
    description: "Encola una generación de video HunyuanVideo en Bellas Artes.",
    inputSchema: {
      operation: z.enum(["t2v", "i2v", "v2v", "action-sync", "effects", "upscale", "lip-sync", "replace-character", "extend"]).default("t2v"),
      prompt: z.string().max(4000).optional(),
      model: z.string().default("hunyuan-video-8b"),
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

  server.registerResource("generation-capabilities", "bellas-artes://capabilities", { mimeType: "application/json" }, async () => ({
    contents: [{ uri: "bellas-artes://capabilities", mimeType: "application/json", text: JSON.stringify({ models: ["flux-schnell", "hunyuan-video", "f5-tts", "rvc"], credits: { image: 1, video: 80 }, status: "queued/processing/completed/failed/canceled" }) }],
  }));

  return server;
}
