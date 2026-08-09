import { describe, expect, it } from "vitest"

import { createCreativeProjectSchema, storyDocumentSchema, updateCreativeProjectSchema } from "./contracts"

const sceneId = "11111111-1111-4111-8111-111111111111"
const shotId = "22222222-2222-4222-8222-222222222222"
const document = { version: 1 as const, scenes: [{ id: sceneId, title: "Escena 1", order: 0, durationSeconds: 5, notes: "", shots: [{ id: shotId, title: "Plano 1", order: 0, durationSeconds: 5, prompt: "Amanecer", camera: null, transition: null, assetIds: [] }] }] }

describe("Story contracts", () => {
  it.each(["director", "story"] as const)("acepta proyectos %s", (kind) => {
    expect(createCreativeProjectSchema.safeParse({ kind, title: "Proyecto", storyType: kind === "story" ? "custom" : null, document }).success).toBe(true)
  })

  it("rechaza título vacío, userId y campos desconocidos", () => {
    expect(createCreativeProjectSchema.safeParse({ kind: "story", title: "", document }).success).toBe(false)
    expect(createCreativeProjectSchema.safeParse({ kind: "story", title: "Proyecto", document, userId: "otro" }).success).toBe(false)
    expect(updateCreativeProjectSchema.safeParse({ unknown: true }).success).toBe(false)
  })

  it("rechaza IDs, órdenes y duraciones inválidas", () => {
    expect(storyDocumentSchema.safeParse({ version: 1, scenes: [{ ...document.scenes[0], id: "no-uuid" }] }).success).toBe(false)
    expect(storyDocumentSchema.safeParse({ version: 1, scenes: [document.scenes[0], { ...document.scenes[0], id: "33333333-3333-4333-8333-333333333333" }] }).success).toBe(false)
    expect(storyDocumentSchema.safeParse({ version: 1, scenes: [{ ...document.scenes[0], durationSeconds: 0 }] }).success).toBe(false)
  })

  it("rechaza IDs y órdenes de shots duplicados", () => {
    const duplicate = { ...document.scenes[0].shots[0], title: "Plano 2" }
    expect(storyDocumentSchema.safeParse({ version: 1, scenes: [{ ...document.scenes[0], shots: [document.scenes[0].shots[0], duplicate] }] }).success).toBe(false)
  })
})
