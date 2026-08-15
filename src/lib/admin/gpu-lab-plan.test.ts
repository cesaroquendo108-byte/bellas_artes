import { describe, expect, it } from "vitest";

import { COMFY_TEMPLATE_CATALOG } from "@/lib/generation/comfy-template-catalog";
import { GPU_LAB_PLAN, summarizeGpuLabPlan } from "./gpu-lab-plan";

describe("plan del laboratorio GPU", () => {
  it("mantiene orden único y cubre la sesión rápida de una 3090", () => {
    expect(new Set(GPU_LAB_PLAN.map((item) => item.id)).size).toBe(GPU_LAB_PLAN.length);
    expect(GPU_LAB_PLAN.map((item) => item.order)).toEqual([...GPU_LAB_PLAN.map((item) => item.order)].sort((a, b) => a - b));
    expect(summarizeGpuLabPlan()).toMatchObject({ total: 11, runnable: 5, runnableMinutes: 80, manual: 2, conditional: 2, blocked: 2 });
  });

  it("sólo referencia templates privados existentes", () => {
    const templateIds = new Set(COMFY_TEMPLATE_CATALOG.map((entry) => entry.id));
    for (const testCase of GPU_LAB_PLAN) {
      for (const templateId of testCase.templateIds) expect(templateIds.has(templateId), `${testCase.id}:${templateId}`).toBe(true);
    }
  });

  it("bloquea explícitamente cargas impropias para 24 GB", () => {
    const blocked = GPU_LAB_PLAN.find((item) => item.id === "large-models");
    expect(blocked).toMatchObject({ readiness: "blocked_3090", minimumVramGb: 48, timeboxMinutes: 0 });
  });
});
