import { describe, expect, it } from "vitest"

import { imageGenerationRequestSchema } from "./image"

const validRequest = {
  mode: "create" as const,
  prompt: "Un retrato editorial con iluminación violeta",
  model: "gpt-image-2" as const,
  autoPolish: true,
  aspectRatio: "1:1" as const,
  resolution: "1k" as const,
  quality: "low" as const,
  steps: 24,
  cfgScale: 7,
}

describe("imageGenerationRequestSchema", () => {
  it("acepta una solicitud de creación válida", () => {
    expect(imageGenerationRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it("rechaza prompts vacíos y parámetros fuera de rango", () => {
    const result = imageGenerationRequestSchema.safeParse({
      ...validRequest,
      prompt: "   ",
      steps: 51,
      cfgScale: 0,
    })
    expect(result.success).toBe(false)
  })

  it("exige una referencia guardada para variaciones", () => {
    const result = imageGenerationRequestSchema.safeParse({
      ...validRequest,
      mode: "variation",
    })
    expect(result.success).toBe(false)
  })

  it("rechaza userId y cualquier otro campo ajeno al contrato", () => {
    const result = imageGenerationRequestSchema.safeParse({
      ...validRequest,
      userId: "otro-usuario",
    })
    expect(result.success).toBe(false)
  })
})
