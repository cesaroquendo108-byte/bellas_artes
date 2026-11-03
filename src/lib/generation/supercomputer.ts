/**
 * Open Supercomputer: Orquestador Unificado de Pipelines Audiovisuales de Bellas Artes.
 *
 * Basado en la arquitectura agentica de Higgsfield Supercomputer y OpenHiggsfield
 * (wide-trace/open-higgsfield / higgsfield-ai), eliminando el bloqueo comercial y
 * el consumo depredador de creditos mediante ejecucion 100% de pesos abiertos.
 *
 * Coordina:
 * 1. Desglose de guion y beats narrativos.
 * 2. Consistencia de reparto fiduciario (Director's Cut y Wan SCAIL-2).
 * 3. Memoria contextual multi-turno (GOAT'd Context Memory).
 * 4. Enrutamiento inteligente hacia las 120 apps de Freefield.
 * 5. Estimacion fiduciaria de coste GPU en Vast.ai con regla Zero-Idle-Burn.
 */

import { globalPromptContextMemory, type ModelTarget } from "@/lib/prompt-composer/context-memory";

export type PipelineShotType =
  | "character_dialogue"
  | "character_recast"
  | "action_broll"
  | "environment_establishing"
  | "product_hero";

export interface CastMemberBinding {
  handle: string; // e.g. "@cesar"
  name: string;
  portraitUrl?: string;
  roleDescription: string;
}

export interface PipelineShot {
  shotNumber: number;
  title: string;
  durationSeconds: number;
  shotType: PipelineShotType;
  recommendedApp: "directors-cut" | "recast" | "openjutsu" | "cinema-video" | "h3-video";
  targetModel: ModelTarget;
  cameraMovement: string;
  structuredPrompt: string;
  castHandles: string[];
  audioDialogue?: string;
  soundscape: string;
}

export interface CreativeBrief {
  projectId: string;
  title: string;
  targetDurationSeconds?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  coreMessage: string;
  cast?: CastMemberBinding[];
  tone?: "cinematic" | "documentary" | "corporate" | "editorial";
}

export interface SupercomputerPlan {
  projectId: string;
  title: string;
  totalDurationSeconds: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  cast: CastMemberBinding[];
  shots: PipelineShot[];
  estimatedGpuSeconds: number;
  estimatedVastCostUsd: number;
  fiduciaryNotice: string;
}

/**
 * Planifica de forma agentica un pipeline audiovisual de multiples tomas.
 */
export function planSupercomputerPipeline(brief: CreativeBrief): SupercomputerPlan {
  const targetDuration = brief.targetDurationSeconds ?? 15;
  const aspectRatio = brief.aspectRatio ?? "16:9";
  const cast = brief.cast ?? [
    {
      handle: "@portavoz",
      name: "Portavoz Institucional",
      roleDescription: "Experto financiero con vestimenta formal sobria",
    },
  ];

  // Registrar en memoria contextual de GOAT'd
  const session = globalPromptContextMemory.getOrCreateSession(brief.projectId);
  for (const c of cast) {
    session.activeSubjects.set(c.handle, `${c.name}: ${c.roleDescription}`);
  }

  const shots: PipelineShot[] = [];

  // Toma 1: Anchor Hook / Presentador (5 a 6 s)
  const hookPrompt = globalPromptContextMemory.formatWithModelGuide(
    "minimax-h3",
    `Plano medio con iluminación suave de estudio. ${cast[0].name} mira fijamente a la cámara con expresión de convicción institucional sobre fondo arquitectónico sobrio.`,
    {
      dialogue: "En el análisis fiduciario, la preservación del capital y la verdad de los datos son innegociables.",
      subjects: {
        "Subject 1": `${cast[0].name} (${cast[0].roleDescription})`,
      },
      soundscape: "Silencio de sala acústica tratada, presencia vocal nítida al centro.",
    },
  );

  shots.push({
    shotNumber: 1,
    title: "Anchor Hook Portavoz",
    durationSeconds: 5,
    shotType: "character_dialogue",
    recommendedApp: "directors-cut",
    targetModel: "minimax-h3",
    cameraMovement: "Slow Push-In constante a velocidad cinematográfica",
    structuredPrompt: hookPrompt,
    castHandles: [cast[0].handle],
    audioDialogue: "En el análisis fiduciario, la preservación del capital y la verdad de los datos son innegociables.",
    soundscape: "Silencio de sala acústica tratada, presencia vocal nítida al centro.",
  });

  // Toma 2: B-Roll de Datos / Entorno / Acción
  if (targetDuration >= 10) {
    shots.push({
      shotNumber: 2,
      title: "B-Roll Análisis Macroeconómico",
      durationSeconds: 5,
      shotType: "environment_establishing",
      recommendedApp: "cinema-video",
      targetModel: "wan-2.1",
      cameraMovement: "Lateral Dolly Tracking de izquierda a derecha",
      structuredPrompt:
        "Terminal financiera de alta gama mostrando gráficos bursátiles sobrios con velas japonesas, pantallas múltiples en penumbra cálida, estilo Bloomberg sin distorsión.",
      castHandles: [],
      soundscape: "Murmullo tenue de sala de trading, tecleo suave y ambiente bancario distante.",
    });
  }

  // Toma 3: Cierre Hero y Conclusión
  if (targetDuration >= 15) {
    const closePrompt = globalPromptContextMemory.formatWithModelGuide(
      "minimax-h3",
      `Primer plano de ${cast[0].name} asintiendo con serenidad, con el logo institucional en transparencia suave detrás.`,
      {
        dialogue: brief.coreMessage.slice(0, 120),
        subjects: {
          "Subject 1": `${cast[0].name} (${cast[0].roleDescription})`,
        },
        soundscape: "Cierre acústico limpio con caída en seco al beat.",
      },
    );

    shots.push({
      shotNumber: 3,
      title: "Hero Close & Tesis Fiduciaria",
      durationSeconds: 5,
      shotType: "character_dialogue",
      recommendedApp: "directors-cut",
      targetModel: "minimax-h3",
      cameraMovement: "Plano estático con estabilización de trípode",
      structuredPrompt: closePrompt,
      castHandles: [cast[0].handle],
      audioDialogue: brief.coreMessage.slice(0, 120),
      soundscape: "Cierre acústico limpio con caída en seco al beat.",
    });
  }

  const totalDuration = shots.reduce((sum, s) => sum + s.durationSeconds, 0);

  // Estimación fiduciaria de tiempo e inversión de cómputo GPU
  // En RTX 5090 Blackwell: ~30 segundos de inferencia por cada toma de 5 segundos H3 / Wan
  const estimatedGpuSeconds = shots.length * 35;
  const vastHourlyRate = 0.79; // USD/hora promedio para RTX 5090 en Vast.ai
  const estimatedVastCostUsd = Number(((estimatedGpuSeconds / 3600) * vastHourlyRate).toFixed(4));

  return {
    projectId: brief.projectId,
    title: brief.title,
    totalDurationSeconds: totalDuration,
    aspectRatio,
    cast,
    shots,
    estimatedGpuSeconds,
    estimatedVastCostUsd,
    fiduciaryNotice:
      "Plan generado bajo arquitectura 100% abierta. Zero Idle Burn: la GPU debe destruirse de inmediato tras completar las tomas.",
  };
}
