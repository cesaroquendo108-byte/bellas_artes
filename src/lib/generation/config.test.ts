import { afterEach, describe, expect, it, vi } from "vitest";
import { getGenerationConfig, getVastComfyBaseUrl, isGenerationRouteConfigured, isGenerationSafetyConfigured } from "./config";

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

  it("usa un gate explícito para avanzar de admin a beta y público", () => {
    vi.stubEnv("GENERATION_ENABLED", "true");
    vi.stubEnv("GENERATION_ADMIN_ONLY", "true");
    vi.stubEnv("GENERATION_ACCESS_MODE", "allowlist");
    expect(getGenerationConfig()).toMatchObject({ accessMode: "allowlist", adminOnly: false });
    vi.stubEnv("GENERATION_ACCESS_MODE", "public");
    expect(getGenerationConfig()).toMatchObject({ accessMode: "public", adminOnly: false });
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
    vi.stubEnv("VAST_TEST_MAX_ESTIMATED_JOB_USD", "0.20");
    vi.stubEnv("VAST_TEST_MODALITY", "image");
    vi.stubEnv("VAST_TEST_RUN_ID", "flux-schnell-acceptance");

    expect(getGenerationConfig().vastTest).toEqual({
      enabled: true,
      budgetUsd: 0.5,
      maxJobs: 5,
      maxEstimatedJobUsd: 0.2,
      modality: "image",
      runId: "flux-schnell-acceptance",
      session: {
        enabled: false,
        id: null,
        budgetUsd: 0,
        reserveUsd: 0.4,
      },
    });
  });

  it("configura una sesión global de pruebas con reserva", () => {
    vi.stubEnv("VAST_TEST_SESSION_ID", "final-pass");
    vi.stubEnv("VAST_TEST_SESSION_BUDGET_USD", "3.20");
    vi.stubEnv("VAST_TEST_RESERVE_USD", "0.40");
    expect(getGenerationConfig().vastTest.session).toEqual({ enabled: true, id: "final-pass", budgetUsd: 3.2, reserveUsd: 0.4 });
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

  it("falla cerrado cuando beta exige auditoría, procedencia o L2 sin configuración", () => {
    vi.stubEnv("GENERATION_REQUIRE_AUDIT", "true");
    vi.stubEnv("GENERATION_AUDIT_ENABLED", "true");
    expect(isGenerationSafetyConfigured()).toBe(false);

    vi.stubEnv("MODERATION_AUDIT_SALT", "test-audit-salt");
    vi.stubEnv("GENERATION_REQUIRE_PROVENANCE", "true");
    expect(isGenerationSafetyConfigured()).toBe(false);

    vi.stubEnv("PROVENANCE_SIGNING_KEY", "test-provenance-key");
    vi.stubEnv("GENERATION_MODERATION_LEVEL", "l2");
    expect(isGenerationSafetyConfigured()).toBe(false);
    vi.stubEnv("GENERATION_MODERATION_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("GENERATION_MODERATION_MODEL", "test-moderation-model");
    expect(isGenerationSafetyConfigured()).toBe(true);
  });
});
