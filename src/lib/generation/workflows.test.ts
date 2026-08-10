import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkflowEnvironmentKey, isWorkflowConfigured, loadWorkflow } from "./workflows";

describe("generation workflows", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("carga el workflow versionado de Flux Schnell", () => {
    expect(isWorkflowConfigured("image/flux-schnell-v1")).toBe(true);
    expect(loadWorkflow("image/flux-schnell-v1")).toHaveProperty("3.class_type", "KSampler");
  });

  it("rechaza rutas fuera del directorio permitido", () => {
    expect(isWorkflowConfigured("../.env.local")).toBe(false);
  });

  it("permite override por entorno", () => {
    const key = getWorkflowEnvironmentKey("image/test-v1");
    vi.stubEnv(key, JSON.stringify({ node: { class_type: "Test" } }));
    expect(loadWorkflow("image/test-v1")).toEqual({ node: { class_type: "Test" } });
    expect(isWorkflowConfigured("image/test-v1")).toBe(false);
  });
});
