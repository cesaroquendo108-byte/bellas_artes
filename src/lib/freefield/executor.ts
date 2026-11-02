import { buildFreefieldWorkflow, getFreefieldApp } from "./registry";
import type { FreefieldWorkflowGraph } from "./types";

export interface FreefieldExecutionOptions {
  comfyUrl?: string;
  clientId?: string;
  pollIntervalMs?: number;
  timeoutSeconds?: number;
  dryRun?: boolean;
}

export interface FreefieldArtifact {
  filename: string;
  subfolder: string;
  type: string;
  url: string;
}

export interface FreefieldExecutionResult {
  success: boolean;
  appId: string;
  appName: string;
  promptId?: string;
  status: "completed" | "failed" | "dry_run";
  durationSeconds?: number;
  outputs?: Record<string, unknown>;
  artifacts: FreefieldArtifact[];
  error?: string;
}

export function resolveComfyUrl(override?: string): string {
  const envUrl = process.env.VAST_COMFY_BASE_URL || process.env.COMFYUI_URL;
  const raw = override || envUrl || "http://127.0.0.1:18188";
  return raw.replace(/\/$/, "");
}

export async function executeFreefieldApp(
  appId: string,
  inputs: Record<string, unknown>,
  options: FreefieldExecutionOptions = {},
): Promise<FreefieldExecutionResult> {
  const app = getFreefieldApp(appId);
  if (!app) {
    throw new Error(`La aplicación Freefield "${appId}" no existe.`);
  }

  const { prompt, resolvedValues } = buildFreefieldWorkflow(appId, inputs);

  if (options.dryRun) {
    return {
      success: true,
      appId,
      appName: app.name,
      status: "dry_run",
      artifacts: [],
      outputs: { resolvedValues, nodeCount: Object.keys(prompt).length },
    };
  }

  const comfyUrl = resolveComfyUrl(options.comfyUrl);
  const clientId = options.clientId || `bellas_artes_freefield_${Date.now()}`;
  const pollIntervalMs = options.pollIntervalMs || 2000;
  const timeoutMs = (options.timeoutSeconds || 900) * 1000;

  // 1. Submit prompt to ComfyUI
  const submitResp = await fetch(`${comfyUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, client_id: clientId }),
  });

  if (!submitResp.ok) {
    const errText = await submitResp.text().catch(() => "");
    throw new Error(`Error al enviar prompt a ComfyUI (${submitResp.status}): ${errText}`);
  }

  const submitData = (await submitResp.json()) as { prompt_id?: string; error?: unknown };
  const promptId = submitData.prompt_id;
  if (!promptId) {
    throw new Error(`ComfyUI no devolvió prompt_id: ${JSON.stringify(submitData.error || submitData)}`);
  }

  // 2. Poll for completion
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    let histResp: Response;
    try {
      histResp = await fetch(`${comfyUrl}/history/${promptId}`);
    } catch {
      continue;
    }

    if (!histResp.ok) continue;

    const histData = (await histResp.json()) as Record<
      string,
      {
        status?: { completed?: boolean; status_str?: string; messages?: unknown[] };
        outputs?: Record<
          string,
          {
            images?: Array<{ filename: string; subfolder?: string; type?: string }>;
            videos?: Array<{ filename: string; subfolder?: string; type?: string }>;
            audio?: Array<{ filename: string; subfolder?: string; type?: string }>;
          }
        >;
      }
    >;

    const entry = histData[promptId];
    if (!entry) continue;

    const statusObj = entry.status || {};
    if (statusObj.status_str === "error" || statusObj.status_str === "failed") {
      return {
        success: false,
        appId,
        appName: app.name,
        promptId,
        status: "failed",
        durationSeconds: (Date.now() - startTime) / 1000,
        artifacts: [],
        error: JSON.stringify(statusObj.messages || "Error desconocido en ComfyUI"),
      };
    }

    if (statusObj.completed) {
      const artifacts: FreefieldArtifact[] = [];
      const outputs = entry.outputs || {};

      for (const nodeOutput of Object.values(outputs)) {
        const mediaList = [
          ...(nodeOutput.images || []),
          ...(nodeOutput.videos || []),
          ...(nodeOutput.audio || []),
        ];
        for (const media of mediaList) {
          const sub = media.subfolder || "";
          const t = media.type || "output";
          const viewUrl = `${comfyUrl}/view?filename=${encodeURIComponent(media.filename)}&subfolder=${encodeURIComponent(sub)}&type=${encodeURIComponent(t)}`;
          artifacts.push({
            filename: media.filename,
            subfolder: sub,
            type: t,
            url: viewUrl,
          });
        }
      }

      return {
        success: true,
        appId,
        appName: app.name,
        promptId,
        status: "completed",
        durationSeconds: (Date.now() - startTime) / 1000,
        outputs,
        artifacts,
      };
    }
  }

  throw new Error(`Tiempo de espera agotado (${options.timeoutSeconds || 900}s) esperando a ComfyUI.`);
}
