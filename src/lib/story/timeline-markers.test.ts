import { describe, expect, it } from "vitest";
import type { StoryDocument } from "./contracts";
import {
  exportMarkersToCSV,
  exportMarkersToEDL,
  exportStoryToEffectCraftMarkers,
  importEffectCraftMarkersToStory,
} from "./timeline-markers";

describe("Timeline Markers Engine (EffectCraft / JustAE Flow)", () => {
  const sampleStory: StoryDocument = {
    version: 1,
    scenes: [
      {
        id: "11111111-1111-4000-8000-111111111111",
        title: "Escena 1 - Introducción",
        order: 0,
        durationSeconds: 10,
        notes: "Apertura en el centro financiero",
        shots: [
          {
            id: "22222222-2222-4000-8000-222222222222",
            title: "Toma Aérea",
            order: 0,
            durationSeconds: 4,
            prompt: "Plano cenital de la Bolsa de Valores de Caracas al amanecer",
            camera: "Drone descent",
            transition: "cut",
            assetIds: [],
          },
          {
            id: "33333333-3333-4000-8000-333333333333",
            title: "Presentador Entrada",
            order: 1,
            durationSeconds: 6,
            prompt: "Presentador caminando hacia cámara vestido formal",
            camera: "Tracking medium shot",
            transition: "fade",
            assetIds: [],
          },
        ],
      },
    ],
  };

  it("exporta un StoryDocument a payload JustAE / EffectCraft con marcadores", () => {
    const payload = exportStoryToEffectCraftMarkers(sampleStory, {
      compositionName: "Finve_Opening_Comp",
      width: 1080,
      height: 1920,
      fps: 30,
    });

    expect(payload.compositionName).toBe("Finve_Opening_Comp");
    expect(payload.width).toBe(1080);
    expect(payload.height).toBe(1920);
    expect(payload.durationSeconds).toBe(10);
    expect(payload.markers).toHaveLength(2);
    expect(payload.storyboardRows).toHaveLength(2);

    expect(payload.markers[0].timeInSeconds).toBe(0);
    expect(payload.markers[0].durationSeconds).toBe(4);
    expect(payload.markers[0].prompt).toContain("Plano cenital");

    expect(payload.markers[1].timeInSeconds).toBe(4);
    expect(payload.markers[1].durationSeconds).toBe(6);
  });

  it("reimporta un payload de EffectCraft de vuelta a StoryDocument de Bellas Artes", () => {
    const payload = exportStoryToEffectCraftMarkers(sampleStory, {
      compositionName: "Reimport_Test",
    });

    const reimported = importEffectCraftMarkersToStory(payload);
    expect(reimported.version).toBe(1);
    expect(reimported.scenes).toHaveLength(1);
    expect(reimported.scenes[0].shots).toHaveLength(2);
    expect(reimported.scenes[0].shots[0].prompt).toContain("Plano cenital");
    expect(reimported.scenes[0].shots[1].durationSeconds).toBe(6);
  });

  it("exporta marcadores a EDL CMX 3600 válido", () => {
    const payload = exportStoryToEffectCraftMarkers(sampleStory);
    const edl = exportMarkersToEDL(payload.markers, 30);

    expect(edl).toContain("TITLE: BELLAS ARTES TIMELINE EDL");
    expect(edl).toContain("001  AX       V     C");
    expect(edl).toContain("* FROM CLIP NAME: Escena 1 - Introducción - Toma Aérea");
    expect(edl).toContain("* PROMPT: Plano cenital de la Bolsa de Valores");
  });

  it("exporta marcadores a formato CSV", () => {
    const payload = exportStoryToEffectCraftMarkers(sampleStory);
    const csv = exportMarkersToCSV(payload.markers);

    expect(csv).toContain("Index,Name,StartTimeSec,DurationSec,Prompt,Camera,Transition");
    expect(csv).toContain('"Escena 1 - Introducción - Toma Aérea",0,4');
  });
});
