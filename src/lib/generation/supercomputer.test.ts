import { describe, expect, it } from "vitest";
import { planSupercomputerPipeline } from "./supercomputer";

describe("Open Supercomputer Pipeline Orchestrator", () => {
  it("generates a multi-shot pipeline plan from a creative brief", () => {
    const plan = planSupercomputerPipeline({
      projectId: "proj_bellas_artes_01",
      title: "Análisis Fiduciario de la Bolsa de Valores de Caracas",
      targetDurationSeconds: 15,
      aspectRatio: "16:9",
      coreMessage: "El valor real de las acciones bancarias supera con creces el ruido cambiario.",
      cast: [
        {
          handle: "@cesar",
          name: "César Oquendo",
          roleDescription: "Director de Finve, traje formal oscuro y gafas de lectura",
        },
      ],
    });

    expect(plan.projectId).toBe("proj_bellas_artes_01");
    expect(plan.shots).toHaveLength(3);
    expect(plan.totalDurationSeconds).toBe(15);
    expect(plan.estimatedGpuSeconds).toBeGreaterThan(0);
    expect(plan.estimatedVastCostUsd).toBeGreaterThan(0);

    // Verificar enrutamiento de tomas
    expect(plan.shots[0].recommendedApp).toBe("directors-cut");
    expect(plan.shots[0].targetModel).toBe("minimax-h3");
    expect(plan.shots[0].structuredPrompt).toContain("subject_definitions:");
    expect(plan.shots[0].structuredPrompt).toContain("<Subject 1> is César Oquendo");

    // Verificar toma B-Roll
    expect(plan.shots[1].recommendedApp).toBe("cinema-video");
    expect(plan.shots[1].targetModel).toBe("wan-2.1");
  });

  it("adjusts shot count for shorter durations", () => {
    const shortPlan = planSupercomputerPipeline({
      projectId: "proj_short_hook",
      title: "Hook Vertical 5s",
      targetDurationSeconds: 5,
      aspectRatio: "9:16",
      coreMessage: "Mensaje relampago de 5 segundos",
    });

    expect(shortPlan.shots).toHaveLength(1);
    expect(shortPlan.totalDurationSeconds).toBe(5);
    expect(shortPlan.aspectRatio).toBe("9:16");
  });
});
