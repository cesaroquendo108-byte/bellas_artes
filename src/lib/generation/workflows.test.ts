import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkflowEnvironmentKey, isWorkflowConfigured, loadWorkflow } from "./workflows";

describe("generation workflows", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("carga el workflow versionado de Flux Schnell", () => {
    expect(isWorkflowConfigured("image/flux-schnell-v1")).toBe(true);
    expect(loadWorkflow("image/flux-schnell-v1")).toHaveProperty("3.class_type", "KSampler");
  });

  it("carga los workflows versionados de Wan 2.2 TI2V y Action Sync", () => {
    expect(isWorkflowConfigured("video/wan22-ti2v-5b-i2v-v1")).toBe(true);
    expect(loadWorkflow("video/wan22-ti2v-5b-i2v-v1")).toHaveProperty("sampler.class_type", "KSampler");
    expect(isWorkflowConfigured("video/wan22-ti2v-5b-action-sync-v1")).toBe(true);
    expect(loadWorkflow("video/wan22-ti2v-5b-action-sync-v1")).toHaveProperty("reference.class_type", "LoadVideo");
  });

  it("carga los workflows versionados de Kokoro-82M y LTX-Video 2.3", () => {
    expect(isWorkflowConfigured("audio/kokoro-82m-v1")).toBe(true);
    expect(loadWorkflow("audio/kokoro-82m-v1")).toHaveProperty("text.class_type", "KokoroTTS");
    expect(isWorkflowConfigured("video/ltx-2.3-i2v-v1")).toBe(true);
    expect(loadWorkflow("video/ltx-2.3-i2v-v1")).toHaveProperty("sampler.class_type", "KSampler");
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
