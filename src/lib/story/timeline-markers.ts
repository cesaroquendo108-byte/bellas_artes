import { z } from "zod";
import type { StoryDocument, StoryScene, StoryShot } from "./contracts";

export interface EffectCraftMarker {
  id: string;
  name: string;
  timeInSeconds: number;
  durationSeconds: number;
  workflowId?: string;
  prompt?: string;
  color?: string;
  layerName?: string;
  camera?: string | null;
  transition?: string | null;
  parameters?: Record<string, unknown>;
}

export interface JustAECompStoryboardRow {
  id: string;
  shotNumber: number;
  name: string;
  startTimeSeconds: number;
  durationSeconds: number;
  prompt: string;
  workflow: string;
  model: string;
  status: "pending" | "ready" | "rendered";
}

export interface JustAECompPayload {
  compositionName: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  markers: EffectCraftMarker[];
  storyboardRows: JustAECompStoryboardRow[];
}

export const effectCraftMarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeInSeconds: z.number().min(0),
  durationSeconds: z.number().min(0.1),
  workflowId: z.string().optional(),
  prompt: z.string().optional(),
  color: z.string().optional(),
  layerName: z.string().optional(),
  camera: z.string().nullable().optional(),
  transition: z.string().nullable().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export const justAECompPayloadSchema = z.object({
  compositionName: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  durationSeconds: z.number().min(0),
  markers: z.array(effectCraftMarkerSchema),
  storyboardRows: z.array(
    z.object({
      id: z.string(),
      shotNumber: z.number().int().min(0),
      name: z.string(),
      startTimeSeconds: z.number().min(0),
      durationSeconds: z.number().min(0.1),
      prompt: z.string(),
      workflow: z.string(),
      model: z.string(),
      status: z.enum(["pending", "ready", "rendered"]),
    }),
  ),
});

/**
 * Convierte un StoryDocument de Bellas Artes en marcadores de EffectCraft y filas de JustAE Flow.
 */
export function exportStoryToEffectCraftMarkers(
  story: StoryDocument,
  options: {
    compositionName?: string;
    width?: number;
    height?: number;
    fps?: number;
    defaultWorkflow?: string;
    defaultModel?: string;
  } = {},
): JustAECompPayload {
  const {
    compositionName = "BellasArtes_MasterComp",
    width = 1080,
    height = 1920,
    fps = 30,
    defaultWorkflow = "workflows/freefield/apps/effectcraft/workflow.api.json",
    defaultModel = "ltx-video-2.5",
  } = options;

  const markers: EffectCraftMarker[] = [];
  const storyboardRows: JustAECompStoryboardRow[] = [];

  let currentTime = 0;
  let globalShotIndex = 1;

  for (const scene of story.scenes) {
    for (const shot of scene.shots) {
      const shotDuration = shot.durationSeconds || 4;
      const markerId = shot.id;
      const markerName = `${scene.title} - ${shot.title}`;

      const marker: EffectCraftMarker = {
        id: markerId,
        name: markerName,
        timeInSeconds: Number(currentTime.toFixed(3)),
        durationSeconds: Number(shotDuration.toFixed(3)),
        workflowId: defaultWorkflow,
        prompt: shot.prompt,
        color: "#4F46E5",
        layerName: `Shot_${String(globalShotIndex).padStart(2, "0")}`,
        camera: shot.camera,
        transition: shot.transition,
      };

      markers.push(marker);

      storyboardRows.push({
        id: markerId,
        shotNumber: globalShotIndex,
        name: markerName,
        startTimeSeconds: Number(currentTime.toFixed(3)),
        durationSeconds: Number(shotDuration.toFixed(3)),
        prompt: shot.prompt,
        workflow: defaultWorkflow,
        model: defaultModel,
        status: "pending",
      });

      currentTime += shotDuration;
      globalShotIndex += 1;
    }
  }

  const payload: JustAECompPayload = {
    compositionName,
    width,
    height,
    fps,
    durationSeconds: Number(currentTime.toFixed(3)),
    markers,
    storyboardRows,
  };

  justAECompPayloadSchema.parse(payload);
  return payload;
}

/**
 * Convierte un payload de JustAE / EffectCraft a un StoryDocument de Bellas Artes.
 */
export function importEffectCraftMarkersToStory(payload: JustAECompPayload): StoryDocument {
  justAECompPayloadSchema.parse(payload);

  const scenes: StoryScene[] = [];
  const shots: StoryShot[] = [];

  let totalDuration = 0;

  payload.markers.forEach((marker, index) => {
    shots.push({
      id: marker.id.includes("-") && marker.id.length === 36
        ? marker.id
        : `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      title: marker.name,
      order: index,
      durationSeconds: marker.durationSeconds,
      prompt: marker.prompt || "",
      camera: marker.camera || null,
      transition: marker.transition || null,
      assetIds: [],
    });
    totalDuration += marker.durationSeconds;
  });

  scenes.push({
    id: "00000000-0000-4000-8000-000000000001",
    title: payload.compositionName,
    order: 0,
    durationSeconds: Number(totalDuration.toFixed(3)),
    notes: `Importado de EffectCraft / JustAE Flow. Resolución ${payload.width}x${payload.height} a ${payload.fps}fps.`,
    shots,
  });

  return {
    version: 1,
    scenes,
  };
}

/**
 * Exporta marcadores de línea de tiempo a formato estándar EDL (Edit Decision List CMX 3600).
 */
export function exportMarkersToEDL(markers: EffectCraftMarker[], fps = 30): string {
  const lines: string[] = [
    "TITLE: BELLAS ARTES TIMELINE EDL",
    "FCM: NON-DROP FRAME",
    "",
  ];

  let currentFrame = 0;

  function toTimecode(frames: number): string {
    const hours = Math.floor(frames / (fps * 3600));
    const mins = Math.floor((frames % (fps * 3600)) / (fps * 60));
    const secs = Math.floor((frames % (fps * 60)) / fps);
    const frs = Math.floor(frames % fps);
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frs).padStart(2, "0")}`;
  }

  markers.forEach((marker, index) => {
    const editNum = String(index + 1).padStart(3, "0");
    const durationFrames = Math.max(1, Math.round(marker.durationSeconds * fps));
    const inTc = toTimecode(currentFrame);
    const outTc = toTimecode(currentFrame + durationFrames);

    lines.push(
      `${editNum}  AX       V     C        00:00:00:00 ${toTimecode(durationFrames)} ${inTc} ${outTc}`,
    );
    lines.push(`* FROM CLIP NAME: ${marker.name}`);
    if (marker.prompt) {
      lines.push(`* PROMPT: ${marker.prompt.replace(/\n/g, " ")}`);
    }
    lines.push("");

    currentFrame += durationFrames;
  });

  return lines.join("\n");
}

/**
 * Exporta marcadores a CSV compatible con DaVinci Resolve y After Effects.
 */
export function exportMarkersToCSV(markers: EffectCraftMarker[]): string {
  const headers = ["Index", "Name", "StartTimeSec", "DurationSec", "Prompt", "Camera", "Transition"];
  const rows = markers.map((m, idx) => {
    const escapeCsv = (str: string | null | undefined) =>
      `"${String(str || "").replace(/"/g, '""')}"`;
    return [
      idx + 1,
      escapeCsv(m.name),
      m.timeInSeconds,
      m.durationSeconds,
      escapeCsv(m.prompt),
      escapeCsv(m.camera),
      escapeCsv(m.transition),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
