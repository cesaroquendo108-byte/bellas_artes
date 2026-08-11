import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }))

import { POST as postCharacter } from "@/app/api/generate/character/route"
import { POST as postWorld } from "@/app/api/generate/world/route"

const character = { mode: "prompt", prompt: "Retrato editorial", model: "flux-schnell-reference", aspectRatio: "4:5", cfgScale: 7, steps: 28, seed: 1, randomSeed: true, faceWeight: 0.8 }
const world = { prompt: "Bosque bioluminiscente", model: "flux-schnell-world", aspectRatio: "16:9", cfgScale: 7, seed: 1, randomSeed: true }

describe("Character & World API", () => {
  beforeEach(() => getUser.mockReset())

  it("rechaza usuarios no autenticados", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    expect((await postCharacter(new Request("http://local/api/generate/character", { method: "POST", body: JSON.stringify(character) }))).status).toBe(401)
  })

  it("rechaza JSON inválido y contratos inválidos", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    expect((await postWorld(new Request("http://local/api/generate/world", { method: "POST", body: "{" }))).status).toBe(400)
    expect((await postCharacter(new Request("http://local/api/generate/character", { method: "POST", body: JSON.stringify({ ...character, userId: "otro" }) }))).status).toBe(422)
  })

  it.each([
    [postCharacter, "/api/generate/character", character, "character", "CHARACTER_PROVIDER_NOT_CONFIGURED"],
    [postWorld, "/api/generate/world", world, "world", "WORLD_PROVIDER_NOT_CONFIGURED"],
  ] as const)("devuelve not_configured sin reservar créditos", async (handler, path, body, kind, errorCode) => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    const response = await handler(new Request(`http://local${path}`, { method: "POST", body: JSON.stringify(body) }))
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ jobId: null, kind, status: "not_configured", creditsReserved: 0, errorCode })
  })
})
