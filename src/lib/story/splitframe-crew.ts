import { z } from "zod";
import type { EffectCraftMarker } from "./timeline-markers";

export type CrewRole = "director" | "editor" | "colourist" | "audio";

export interface SplitFrameCrewBrief {
  projectId: string;
  title: string;
  targetDurationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  directorVision: string;
  editorPacing?: "fast-paced" | "cinematic-slow" | "commercial-punchy" | "documentary";
  colourPalette?: "warm-editorial" | "cool-corporate" | "high-contrast-neon" | "monochrome-rich" | "natural-film";
  audioStyle?: "electronic-ambient" | "orchestral-epic" | "hip-hop-beat" | "acoustic-minimal" | "voice-prominent";
  castReference?: Array<{ name: string; referenceUrl: string }>;
}

export interface CrewShotPlan {
  shotIndex: number;
  inSeconds: number;
  durationSeconds: number;
  prompt: string;
  cameraMove: string;
  modelWorkflow: string;
}

export interface CrewEditorPlan {
  pacing: string;
  totalShots: number;
  transitions: Array<{
    betweenShots: [number, number];
    type: "cut" | "crossfade" | "whip-pan" | "zoom-punch";
    durationSeconds: number;
  }>;
  edlFormat: string;
}

export interface CrewColouristPlan {
  palette: string;
  lutRecommendation: string;
  cdl: {
    slope: [number, number, number];
    offset: [number, number, number];
    power: [number, number, number];
    saturation: number;
  };
  scopesTarget: string;
}

export interface CrewAudioPlan {
  bgmStyle: string;
  bedVolumeDb: number;
  duckingUnderVoiceDb: number;
  sfxCues: Array<{
    timeSeconds: number;
    sfxType: string;
    volumeDb: number;
  }>;
}

export interface SplitFrameCrewPlan {
  id: string;
  brief: SplitFrameCrewBrief;
  director: {
    logline: string;
    shotList: CrewShotPlan[];
  };
  editor: CrewEditorPlan;
  colourist: CrewColouristPlan;
  audio: CrewAudioPlan;
}

export const splitFrameCrewBriefSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  targetDurationSeconds: z.number().min(2).max(600),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  directorVision: z.string().min(1),
  editorPacing: z.enum(["fast-paced", "cinematic-slow", "commercial-punchy", "documentary"]).optional(),
  colourPalette: z.enum(["warm-editorial", "cool-corporate", "high-contrast-neon", "monochrome-rich", "natural-film"]).optional(),
  audioStyle: z.enum(["electronic-ambient", "orchestral-epic", "hip-hop-beat", "acoustic-minimal", "voice-prominent"]).optional(),
  castReference: z.array(z.object({ name: z.string(), referenceUrl: z.string() })).optional(),
});

/**
 * Planifica de manera determinista la producción audiovisual orquestando los 4 agentes de SplitFrame:
 * Director, Editor, Colourist y Audio.
 */
export function planSplitFrameCrew(brief: SplitFrameCrewBrief): SplitFrameCrewPlan {
  splitFrameCrewBriefSchema.parse(brief);

  const duration = brief.targetDurationSeconds;
  const pacing = brief.editorPacing || (duration <= 15 ? "fast-paced" : duration <= 60 ? "commercial-punchy" : "cinematic-slow");

  const avgShotDuration = pacing === "fast-paced" ? 2.5 : pacing === "commercial-punchy" ? 3.5 : 5.0;
  const shotCount = Math.max(1, Math.round(duration / avgShotDuration));
  const exactDurationPerShot = Number((duration / shotCount).toFixed(2));

  // 1. Director's Planning
  const shotList: CrewShotPlan[] = [];
  let currentTime = 0;

  const cameraMoves = [
    "Slow push-in on subject",
    "Dynamic tracking shot following motion",
    "Static medium shot with deep depth of field",
    "Subtle Dutch angle with slow pan",
    "Low angle hero view",
  ];

  for (let i = 0; i < shotCount; i++) {
    const isFirst = i === 0;
    const isLast = i === shotCount - 1;
    const camera = cameraMoves[i % cameraMoves.length];

    let prompt = `${brief.directorVision}, shot ${i + 1} of ${shotCount}.`;
    if (brief.castReference && brief.castReference.length > 0) {
      prompt += ` Cast continuity: ${brief.castReference.map((c) => c.name).join(", ")}.`;
    }
    if (isFirst) {
      prompt += " Establishing opening scene, crisp focus, cinematic lighting.";
    } else if (isLast) {
      prompt += " Climax conclusion, definitive visual framing.";
    }

    shotList.push({
      shotIndex: i + 1,
      inSeconds: Number(currentTime.toFixed(2)),
      durationSeconds: exactDurationPerShot,
      prompt,
      cameraMove: camera,
      modelWorkflow: "workflows/freefield/apps/splitframe/workflow.api.json",
    });

    currentTime += exactDurationPerShot;
  }

  // 2. Editor's Planning
  const transitions: CrewEditorPlan["transitions"] = [];
  for (let i = 0; i < shotCount - 1; i++) {
    const transType = pacing === "fast-paced" ? "cut" : i % 2 === 0 ? "cut" : "whip-pan";
    transitions.push({
      betweenShots: [i + 1, i + 2],
      type: transType,
      durationSeconds: transType === "cut" ? 0 : 0.4,
    });
  }

  const editor: CrewEditorPlan = {
    pacing,
    totalShots: shotCount,
    transitions,
    edlFormat: "CMX 3600 standard",
  };

  // 3. Colourist's Planning
  const palette = brief.colourPalette || "warm-editorial";
  const cdlProfiles: Record<string, CrewColouristPlan["cdl"]> = {
    "warm-editorial": {
      slope: [1.05, 1.0, 0.95],
      offset: [0.02, 0.01, -0.01],
      power: [0.98, 1.0, 1.02],
      saturation: 1.1,
    },
    "cool-corporate": {
      slope: [0.95, 1.0, 1.08],
      offset: [-0.01, 0.0, 0.02],
      power: [1.02, 1.0, 0.98],
      saturation: 1.05,
    },
    "high-contrast-neon": {
      slope: [1.15, 1.1, 1.25],
      offset: [-0.03, -0.02, 0.01],
      power: [0.9, 0.95, 0.92],
      saturation: 1.35,
    },
    "monochrome-rich": {
      slope: [1.0, 1.0, 1.0],
      offset: [0.0, 0.0, 0.0],
      power: [1.05, 1.05, 1.05],
      saturation: 0.0,
    },
    "natural-film": {
      slope: [1.02, 1.01, 0.98],
      offset: [0.01, 0.01, 0.0],
      power: [1.0, 1.0, 1.0],
      saturation: 1.0,
    },
  };

  const colourist: CrewColouristPlan = {
    palette,
    lutRecommendation: `SplitFrame_${palette.replace(/-/g, "_").toUpperCase()}_Rec709.cube`,
    cdl: cdlProfiles[palette] || cdlProfiles["warm-editorial"],
    scopesTarget: "Rec.709 Linear Light Primaries, Waveform 0-100 IRE, Vectorscope Skin Tone Line",
  };

  // 4. Audio Planning
  const audioStyle = brief.audioStyle || "electronic-ambient";
  const sfxCues: CrewAudioPlan["sfxCues"] = [];
  const sfxInterval = Math.max(5, Math.round(duration / 4));
  for (let t = sfxInterval; t < duration; t += sfxInterval) {
    sfxCues.push({
      timeSeconds: t,
      sfxType: "hero-impact-shimmer",
      volumeDb: -12,
    });
  }

  const audio: CrewAudioPlan = {
    bgmStyle: audioStyle,
    bedVolumeDb: -18,
    duckingUnderVoiceDb: -22,
    sfxCues,
  };

  return {
    id: `splitframe_plan_${brief.projectId}`,
    brief,
    director: {
      logline: `Pieza de ${duration}s en formato ${brief.aspectRatio} dirigida con ritmo ${pacing}.`,
      shotList,
    },
    editor,
    colourist,
    audio,
  };
}

/**
 * Convierte un plan del crew SplitFrame a marcadores EffectCraft.
 */
export function crewPlanToTimelineMarkers(plan: SplitFrameCrewPlan): EffectCraftMarker[] {
  return plan.director.shotList.map((shot) => ({
    id: `shot_${shot.shotIndex}`,
    name: `Toma ${shot.shotIndex}`,
    timeInSeconds: shot.inSeconds,
    durationSeconds: shot.durationSeconds,
    workflowId: shot.modelWorkflow,
    prompt: shot.prompt,
    color: "#059669",
    layerName: `VideoTrack_Shot${shot.shotIndex}`,
    camera: shot.cameraMove,
  }));
}
