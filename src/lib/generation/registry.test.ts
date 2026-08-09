import { beforeEach, describe, expect, it } from "vitest";
import { creditPackages, generationCreditRates } from "./rates";
import { resolveCharacterRoute, resolveImageRoute, resolveVideoRoute, resolveWorldRoute } from "./registry";

describe("generation registry", () => {
  beforeEach(() => {
    delete process.env.GENERATION_PROVIDER;
  });

  it("mapea los aliases públicos a workflows open source", () => {
    expect(resolveImageRoute("gpt-image-2")).toMatchObject({ backendModel: "flux-schnell", workflowVersion: "image/flux-schnell-v1", credits: 1 });
    expect(resolveVideoRoute("t2v", "openart-video-v2")).toMatchObject({ backendModel: "hunyuan-video-8.3b", credits: 80 });
    expect(resolveCharacterRoute("flux-1-dev").backendModel).toBe("flux-dev-reference");
    expect(resolveWorldRoute("flux-1-dev").workflowVersion).toBe("worlds/flux-world-v1");
  });

  it("mantiene las tarifas de negocio documentadas", () => {
    expect(generationCreditRates).toMatchObject({ image: 1, video: 80, audio: 0, character: 0, world: 0 });
    expect(creditPackages).toMatchObject({ curioso: 600, creador: 1600, estudio: 3500 });
  });
});
