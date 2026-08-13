import { afterEach, describe, expect, it, vi } from "vitest";
import { getGenerationCapability, listGenerationCapabilities } from "./capabilities";

describe("generation capabilities", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("distingue un workflow real deshabilitado de un contrato sin workflow", () => {
    vi.stubEnv("GENERATION_ENABLED", "false");
    expect(getGenerationCapability("image-flux-schnell")).toMatchObject({ status: "disabled", workflowConfigured: true });
    expect(getGenerationCapability("audio-f5-tts-es")).toMatchObject({ status: "contract_only", workflowConfigured: false });
  });

  it("expone acceso admin y beta sólo para workflows configurados", () => {
    vi.stubEnv("GENERATION_ENABLED", "true");
    vi.stubEnv("GENERATION_ACCESS_MODE", "admin");
    expect(getGenerationCapability("image-flux-schnell")?.status).toBe("admin_only");
    vi.stubEnv("GENERATION_ACCESS_MODE", "allowlist");
    expect(getGenerationCapability("image-flux-schnell")?.status).toBe("beta");
  });

  it("usa exclusivamente nombres de modelos propios y open source", () => {
    const serialized = JSON.stringify(listGenerationCapabilities());
    expect(serialized).not.toMatch(/gpt-image|kling|seedance|sora|veo/i);
  });

  it("expone metadatos de procedencia sin convertir modelos declarativos en workflows operativos", () => {
    expect(getGenerationCapability("image-pixart-sigma-v1")).toMatchObject({
      model: "pixart-sigma",
      workflowVersion: "image/pixart-sigma-v1",
      workflowConfigured: false,
      realWorkflowConfigured: false,
      catalogStatus: "preparing",
    });
  });
});
