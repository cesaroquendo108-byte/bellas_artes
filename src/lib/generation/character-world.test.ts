import { describe, expect, it } from "vitest"

import { characterGenerationRequestSchema, worldGenerationRequestSchema } from "./character-world"

const assetId = "11111111-1111-4111-8111-111111111111"
const characterBase = {
  model: "flux-1-dev" as const,
  aspectRatio: "4:5" as const,
  cfgScale: 7,
  steps: 28,
  seed: 42,
  randomSeed: false,
  faceWeight: 0.8,
}
const structured = { gender: "female", ethnicity: "latina", ageRange: "adult", bodyType: "athletic", aesthetic: "cinematic", expression: "confident", pose: "three-quarter" }

describe("characterGenerationRequestSchema", () => {
  it.each([
    { ...characterBase, mode: "reference", referenceAssetIds: [assetId] },
    { ...characterBase, mode: "prompt", prompt: "Heroína cyberpunk venezolana" },
    { ...characterBase, mode: "structured", structured },
  ])("acepta los tres modos válidos", (request) => expect(characterGenerationRequestSchema.safeParse(request).success).toBe(true))

  it("rechaza reference sin assets", () => expect(characterGenerationRequestSchema.safeParse({ ...characterBase, mode: "reference" }).success).toBe(false))
  it("rechaza prompt vacío", () => expect(characterGenerationRequestSchema.safeParse({ ...characterBase, mode: "prompt", prompt: " " }).success).toBe(false))
  it("rechaza structured incompleto", () => expect(characterGenerationRequestSchema.safeParse({ ...characterBase, mode: "structured", structured: { ...structured, pose: "" } }).success).toBe(false))
  it.each([
    { cfgScale: 21 }, { steps: 2 }, { faceWeight: 2 }, { aspectRatio: "3:2" },
  ])("rechaza parámetros fuera de rango", (override) => expect(characterGenerationRequestSchema.safeParse({ ...characterBase, mode: "prompt", prompt: "x", ...override }).success).toBe(false))
  it("rechaza userId y campos desconocidos", () => expect(characterGenerationRequestSchema.safeParse({ ...characterBase, mode: "prompt", prompt: "x", userId: assetId }).success).toBe(false))
})

describe("worldGenerationRequestSchema", () => {
  const valid = { prompt: "Ciudad flotante entre tepuyes", model: "kling-3-omni", aspectRatio: "16:9", cfgScale: 8, seed: 9, randomSeed: true }
  it("acepta un mundo válido", () => expect(worldGenerationRequestSchema.safeParse(valid).success).toBe(true))
  it("rechaza prompt vacío", () => expect(worldGenerationRequestSchema.safeParse({ ...valid, prompt: "" }).success).toBe(false))
  it("rechaza modelo o ratio inválidos", () => {
    expect(worldGenerationRequestSchema.safeParse({ ...valid, model: "otro" }).success).toBe(false)
    expect(worldGenerationRequestSchema.safeParse({ ...valid, aspectRatio: "3:2" }).success).toBe(false)
  })
  it("rechaza IDs inválidos y userId", () => {
    expect(worldGenerationRequestSchema.safeParse({ ...valid, referenceAssetIds: ["asset-1"] }).success).toBe(false)
    expect(worldGenerationRequestSchema.safeParse({ ...valid, userId: assetId }).success).toBe(false)
  })
})
