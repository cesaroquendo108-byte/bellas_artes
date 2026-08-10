import { afterEach, describe, expect, it, vi } from "vitest";
import { getGenerationConfig, getVastComfyBaseUrl, isGenerationRouteConfigured } from "./config";

describe("generation safety defaults", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps generation admin-only when enabled without an explicit override", () => {
    vi.stubEnv("GENERATION_ENABLED", "true");
    delete process.env.GENERATION_ADMIN_ONLY;

    expect(getGenerationConfig().adminOnly).toBe(true);
  });

  it("allows an explicit admin-only override for a controlled rollout", () => {
    vi.stubEnv("GENERATION_ENABLED", "true");
    vi.stubEnv("GENERATION_ADMIN_ONLY", "false");

    expect(getGenerationConfig().adminOnly).toBe(false);
  });

  it("acepta únicamente Vast o fake como rutas activas", () => {
    vi.stubEnv("GENERATION_PROVIDER", "runpod");
    expect(getGenerationConfig().route).toBeNull();
  });

  it("usa billing shadow por defecto y exige opt-in para live", () => {
    expect(getGenerationConfig().billingMode).toBe("shadow");
    vi.stubEnv("GENERATION_BILLING_MODE", "live");
    expect(getGenerationConfig().billingMode).toBe("live");
  });

  it("sólo activa el arnés Vast con presupuesto y máximo de jobs válidos", () => {
    vi.stubEnv("VAST_TEST_BUDGET_USD", "0.50");
    vi.stubEnv("VAST_TEST_MAX_JOBS", "5");
    vi.stubEnv("VAST_TEST_MODALITY", "image");
    vi.stubEnv("VAST_TEST_RUN_ID", "flux-schnell-acceptance");

    expect(getGenerationConfig().vastTest).toEqual({
      enabled: true,
      budgetUsd: 0.5,
      maxJobs: 5,
      modality: "image",
      runId: "flux-schnell-acceptance",
    });
  });

  it("resuelve endpoints Vast por modalidad con fallback compatible", () => {
    vi.stubEnv("VAST_COMFY_BASE_URL", "https://vast.example/base");
    vi.stubEnv("VAST_AUDIO_COMFY_BASE_URL", "https://vast.example/audio");
    expect(getVastComfyBaseUrl("image")).toBe("https://vast.example/base");
    expect(getVastComfyBaseUrl("audio")).toBe("https://vast.example/audio");
  });

  it("bloquea activaciones con controles Serverless inseguros", () => {
    vi.stubEnv("GENERATION_ENABLED", "true");
    vi.stubEnv("GENERATION_PROVIDER", "vast");
    vi.stubEnv("VAST_IMAGE_COMFY_BASE_URL", "https://vast.example/image");
    vi.stubEnv("WORKFLOW_IMAGE_FLUX_SCHNELL_V1", "{}");
    vi.stubEnv("VAST_SERVERLESS_MAX_WORKERS", "2");

    expect(isGenerationRouteConfigured({ providerRoute: "vast", workflowVersion: "image/flux-schnell-v1" })).toBe(false);
  });
});
