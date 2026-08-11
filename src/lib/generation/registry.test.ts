import { beforeEach, describe, expect, it } from "vitest";
import { creditPackages, generationCreditRates } from "./rates";
import { resolveCharacterRoute, resolveImageRoute, resolveLivePortraitRoute, resolveVideoRoute, resolveWorldRoute } from "./registry";

describe("generation registry", () => {
  beforeEach(() => {
    delete process.env.GENERATION_PROVIDER;
  });

  it("mapea los modelos canónicos a workflows open source", () => {
    expect(resolveImageRoute("flux-schnell")).toMatchObject({ backendModel: "flux-schnell", workflowVersion: "image/flux-schnell-v1", credits: 1 });
    expect(resolveVideoRoute("t2v", "hunyuan-video-1.5-8.3b")).toMatchObject({
      backendModel: "hunyuan-video-8.3b",
      workflowVersion: "video/hunyuan-8.3b-t2v-v1",
      credits: 80,
    });
    expect(resolveCharacterRoute("flux-dev-reference").backendModel).toBe("flux-dev-reference");
    expect(resolveWorldRoute("flux-dev-world").workflowVersion).toBe("worlds/flux-world-v1");
    expect(resolveLivePortraitRoute()).toMatchObject({ workflowVersion: "characters/liveportrait-v1", operation: "liveportrait" });
  });

  it("resuelve un workflow distinto por operación y entitlement de modelo", () => {
    expect(resolveVideoRoute("i2v", "hunyuan-video-1.5-8.3b").workflowVersion).toBe("video/hunyuan-8.3b-i2v-v1");
    expect(resolveVideoRoute("lip-sync", "hunyuan-13b-pro")).toMatchObject({
      backendModel: "hunyuan-video-13b",
      workflowVersion: "video/hunyuan-13b-lip-sync-v1",
    });
  });

  it("mantiene las tarifas de negocio documentadas", () => {
    expect(generationCreditRates).toMatchObject({ image: 1, video: 80, audio: 0, character: 0, world: 0 });
    expect(creditPackages).toMatchObject({ curioso: 600, creador: 1600, estudio: 3500 });
  });
});
