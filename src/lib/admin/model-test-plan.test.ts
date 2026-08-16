import { describe, expect, it } from "vitest";

import {
  getModelTestPlanEntry,
  listModelTestPlan,
  summarizeModelTestPlan,
} from "./model-test-plan";

describe("model test plan", () => {
  it("cubre los 22 modelos del catálogo runtime sin exponerlos a clientes", () => {
    const plan = listModelTestPlan();
    expect(plan).toHaveLength(22);
    expect(new Set(plan.map((entry) => entry.modelId)).size).toBe(22);
    expect(plan.every((entry) => entry.acceptanceJobs === 5 || entry.runtimeStatus === "replaced")).toBe(true);
  });

  it("separa GPU, componentes, investigación y reemplazos", () => {
    expect(getModelTestPlanEntry("flux-schnell")).toMatchObject({
      wave: "image-3090",
      execution: "gpu",
      canRunAdminSmoke: true,
      acceptanceJobs: 5,
    });
    expect(getModelTestPlanEntry("real-esrgan")).toMatchObject({
      wave: "control-and-postprocess",
      execution: "manual",
    });
    expect(getModelTestPlanEntry("flux-dev")).toMatchObject({
      wave: "research-policy",
      execution: "gpu",
      canRunAdminSmoke: false,
    });
    expect(getModelTestPlanEntry("cmu-openpose")).toMatchObject({
      wave: "replaced",
      execution: "none",
      acceptanceJobs: 0,
    });
  });

  it("publica los límites de la primera sesión", () => {
    expect(summarizeModelTestPlan()).toMatchObject({
      total: 22,
      installed: 22,
      executable: 1,
      pending: 9,
      researchOnly: 7,
      components: 3,
      replaced: 2,
    });
    expect(summarizeModelTestPlan().waves.find((wave) => wave.id === "image-3090")).toMatchObject({
      budgetUsd: 5,
      minimumVramGb: 24,
      models: 5,
      ready: 1,
    });
  });
});
