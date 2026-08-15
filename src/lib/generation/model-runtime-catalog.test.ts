import { describe, expect, it } from "vitest";

import {
  getModelRuntimeEntry,
  listModelRuntimeCatalog,
  summarizeModelRuntime,
} from "./model-runtime-catalog";

describe("model runtime catalog", () => {
  it("registra los 22 paquetes del vault y los mantiene privados", () => {
    const models = listModelRuntimeCatalog();
    expect(models).toHaveLength(22);
    expect(new Set(models.map((model) => model.id)).size).toBe(22);
    expect(models.every((model) => model.adminOnly)).toBe(true);
    expect(getModelRuntimeEntry("flux-schnell")).toMatchObject({
      vault: "primary",
      workflowConfigured: true,
      status: "workflow_ready",
      canRunAdminSmoke: true,
    });
  });

  it("distingue un workflow ejecutable, un contrato y un reemplazo", () => {
    expect(getModelRuntimeEntry("flux2-klein-4b")).toMatchObject({
      status: "workflow_pending",
      workflowConfigured: false,
      canRunAdminSmoke: false,
    });
    expect(getModelRuntimeEntry("real-esrgan")).toMatchObject({
      role: "postprocess",
      status: "component_pending",
    });
    expect(getModelRuntimeEntry("cmu-openpose")).toMatchObject({ status: "replaced" });
    expect(summarizeModelRuntime()).toMatchObject({
      total: 22,
      workflowReady: 1,
      smokeReady: 1,
      replaced: 2,
    });
  });
});
