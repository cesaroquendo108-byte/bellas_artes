import { afterEach, describe, expect, it, vi } from "vitest";
import { moderateGenerationInput, moderateGenerationRequest } from "./moderation";

afterEach(() => {
  delete process.env.GENERATION_MODERATION_LEVEL;
  delete process.env.GENERATION_MODERATION_PROVIDER;
  delete process.env.GENERATION_MODERATION_MODEL;
  delete process.env.OPENROUTER_API_KEY;
  vi.unstubAllGlobals();
});

describe("generation moderation", () => {
  it("permite prompts creativos normales", () => {
    expect(moderateGenerationInput({ prompt: "Retrato editorial en una biblioteca", negativePrompt: "blur" }).allowed).toBe(true);
  });

  it("bloquea términos de alto riesgo antes de reservar", () => {
    expect(moderateGenerationInput({ prompt: "deepfake without consent de una persona real" })).toMatchObject({ allowed: false, code: "PROMPT_BLOCKED" });
  });

  it("falla cerrado si L2 fue exigido pero no está configurado", async () => {
    process.env.GENERATION_MODERATION_LEVEL = "l2";
    await expect(moderateGenerationRequest({ prompt: "Retrato editorial" })).rejects.toThrow("GENERATION_L2_MODERATION_NOT_CONFIGURED");
  });

  it("consume una decisión L2 estructurada", async () => {
    process.env.GENERATION_MODERATION_LEVEL = "l2";
    process.env.GENERATION_MODERATION_PROVIDER = "openrouter";
    process.env.GENERATION_MODERATION_MODEL = "moderation-model";
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ allowed: false, reason: "Suplantación sin consentimiento" }) } }],
    }), { status: 200 })));
    await expect(moderateGenerationRequest({ prompt: "Una persona real" })).resolves.toMatchObject({ allowed: false, code: "PROMPT_BLOCKED" });
  });
});
