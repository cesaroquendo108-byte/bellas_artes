import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}))

import { POST } from "./route"

const validRequest = {
  operation: "t2v",
  model: "hunyuan-video-1.5-8.3b",
  prompt: "Una escena cinematográfica",
  aspectRatio: "16:9",
  parameters: {},
}

describe("POST /api/generate/video", () => {
  beforeEach(() => getUser.mockReset())

  it("rechaza solicitudes no autenticadas", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const response = await POST(new Request("http://localhost/api/generate/video", { method: "POST", body: JSON.stringify(validRequest) }))
    expect(response.status).toBe(401)
  })

  it("rechaza JSON inválido", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    const response = await POST(new Request("http://localhost/api/generate/video", { method: "POST", body: "{" }))
    expect(response.status).toBe(400)
  })

  it("rechaza contratos inválidos", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    const response = await POST(new Request("http://localhost/api/generate/video", { method: "POST", body: JSON.stringify({ ...validRequest, userId: "otro" }) }))
    expect(response.status).toBe(422)
  })

  it("declara el proveedor no configurado sin reservar créditos", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    const response = await POST(new Request("http://localhost/api/generate/video", { method: "POST", body: JSON.stringify(validRequest) }))
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      jobId: null,
      kind: "video",
      operation: "t2v",
      status: "not_configured",
      creditsReserved: 0,
      errorCode: "VIDEO_PROVIDER_NOT_CONFIGURED",
    })
  })
})
