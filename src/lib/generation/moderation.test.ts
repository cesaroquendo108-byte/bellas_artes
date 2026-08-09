import { describe, expect, it } from "vitest";
import { moderateGenerationInput } from "./moderation";

describe("generation moderation", () => {
  it("permite prompts creativos normales", () => {
    expect(moderateGenerationInput({ prompt: "Retrato editorial en una biblioteca", negativePrompt: "blur" }).allowed).toBe(true);
  });

  it("bloquea términos de alto riesgo antes de reservar", () => {
    expect(moderateGenerationInput({ prompt: "deepfake without consent de una persona real" })).toMatchObject({ allowed: false, code: "PROMPT_BLOCKED" });
  });
});
