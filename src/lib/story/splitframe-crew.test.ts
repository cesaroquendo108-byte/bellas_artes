import { describe, expect, it } from "vitest";
import { crewPlanToTimelineMarkers, planSplitFrameCrew } from "./splitframe-crew";

describe("SplitFrame AI Crew Planner", () => {
  it("planifica una producción completa con los cuatro agentes especializados", () => {
    const plan = planSplitFrameCrew({
      projectId: "proj_99",
      title: "Cierre Bursátil Semanal",
      targetDurationSeconds: 15,
      aspectRatio: "9:16",
      directorVision: "Análisis financiero dinámico para Instagram Reels",
      editorPacing: "fast-paced",
      colourPalette: "warm-editorial",
      audioStyle: "electronic-ambient",
      castReference: [{ name: "César Oquendo", referenceUrl: "https://r2.bellasartes.com/cast/cesar.png" }],
    });

    expect(plan.id).toBe("splitframe_plan_proj_99");
    expect(plan.director.shotList.length).toBeGreaterThan(0);
    expect(plan.director.shotList[0].prompt).toContain("César Oquendo");

    // Editor
    expect(plan.editor.pacing).toBe("fast-paced");
    expect(plan.editor.totalShots).toBe(plan.director.shotList.length);
    expect(plan.editor.transitions.length).toBe(plan.director.shotList.length - 1);

    // Colourist
    expect(plan.colourist.palette).toBe("warm-editorial");
    expect(plan.colourist.cdl.saturation).toBe(1.1);
    expect(plan.colourist.lutRecommendation).toContain(".cube");

    // Audio
    expect(plan.audio.bgmStyle).toBe("electronic-ambient");
    expect(plan.audio.bedVolumeDb).toBe(-18);
    expect(plan.audio.duckingUnderVoiceDb).toBe(-22);
    expect(plan.audio.sfxCues.length).toBeGreaterThan(0);
  });

  it("convierte el plan de rodaje en marcadores de EffectCraft", () => {
    const plan = planSplitFrameCrew({
      projectId: "proj_100",
      title: "Finve Pitch",
      targetDurationSeconds: 20,
      aspectRatio: "16:9",
      directorVision: "Presentación corporativa de banca de inversión",
      editorPacing: "commercial-punchy",
    });

    const markers = crewPlanToTimelineMarkers(plan);
    expect(markers.length).toBe(plan.director.shotList.length);
    expect(markers[0].timeInSeconds).toBe(0);
    expect(markers[0].durationSeconds).toBeGreaterThan(0);
    expect(markers[0].workflowId).toContain("splitframe");
  });
});
