import { describe, expect, it } from "vitest"

import { videoGenerationRequestSchema, videoOperations } from "./video"

const base = {
  model: "hunyuan-video-1.5-8.3b",
  prompt: "Una escena cinematográfica con movimiento suave",
  aspectRatio: "16:9" as const,
  parameters: {},
}

const validByOperation = {
  t2v: { ...base, operation: "t2v" },
  i2v: { ...base, operation: "i2v", sourceAssetIds: ["frame-1"] },
  v2v: { ...base, operation: "v2v", sourceAssetIds: ["video-1"] },
  "action-sync": { ...base, operation: "action-sync", sourceAssetIds: ["motion-1"], referenceAssetIds: ["character-1"] },
  effects: { ...base, operation: "effects", sourceAssetIds: ["image-1"], parameters: { effectTemplate: "portal" } },
  upscale: { ...base, operation: "upscale", sourceAssetIds: ["video-1"], parameters: { targetResolution: "4k" } },
  "lip-sync": { ...base, operation: "lip-sync", sourceAssetIds: ["video-1"], parameters: { audioMode: "tts" } },
  "replace-character": { ...base, operation: "replace-character", sourceAssetIds: ["video-1"], referenceAssetIds: ["character-1"] },
  extend: { ...base, operation: "extend", sourceAssetIds: ["video-1"], parameters: { extendMode: "time", extendDirection: "forward", extensionSeconds: 5 } },
} as const

describe("videoGenerationRequestSchema", () => {
  it.each(videoOperations)("acepta una solicitud válida de %s", (operation) => {
    expect(videoGenerationRequestSchema.safeParse(validByOperation[operation]).success).toBe(true)
  })

  it("rechaza T2V sin prompt", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.t2v, prompt: undefined }).success).toBe(false)
  })

  it("rechaza operaciones de edición sin video fuente", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.v2v, sourceAssetIds: undefined }).success).toBe(false)
  })

  it("rechaza el frame fuente faltante en I2V", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.i2v, sourceAssetIds: undefined }).success).toBe(false)
  })

  it("rechaza Action Sync sin imagen o video", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation["action-sync"], sourceAssetIds: undefined }).success).toBe(false)
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation["action-sync"], referenceAssetIds: undefined }).success).toBe(false)
  })

  it("rechaza Effects sin plantilla", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.effects, parameters: {} }).success).toBe(false)
  })

  it("rechaza resoluciones no soportadas en Upscale", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.upscale, parameters: { targetResolution: "8k" } }).success).toBe(false)
  })

  it("rechaza duraciones inválidas en Extend", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.extend, parameters: { extendMode: "time", extendDirection: "forward", extensionSeconds: 30 } }).success).toBe(false)
  })

  it("rechaza una dirección inválida en Extend", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.extend, parameters: { extendMode: "time", extendDirection: "diagonal", extensionSeconds: 5 } }).success).toBe(false)
  })

  it("rechaza Lip-Sync por upload sin pista de audio", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation["lip-sync"], parameters: { audioMode: "upload" } }).success).toBe(false)
  })

  it("rechaza Replace Character sin personaje", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation["replace-character"], referenceAssetIds: undefined }).success).toBe(false)
  })

  it("rechaza userId y campos fuera del contrato", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...validByOperation.t2v, userId: "otro-usuario" }).success).toBe(false)
  })

  it("rechaza operaciones desconocidas", () => {
    expect(videoGenerationRequestSchema.safeParse({ ...base, operation: "unknown" }).success).toBe(false)
  })
})
