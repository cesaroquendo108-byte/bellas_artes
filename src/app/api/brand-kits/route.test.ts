import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createBrandKit: vi.fn(),
  getBrandKitSession: vi.fn(),
  listBrandKits: vi.fn(),
}))

vi.mock("@/lib/brand-kits/queries", () => mocks)

import { GET, POST } from "./route"

describe("/api/brand-kits", () => {
  beforeEach(() => vi.clearAllMocks())

  it("protege la colección privada", async () => {
    mocks.getBrandKitSession.mockResolvedValue({ supabase: {}, user: null })
    expect((await GET()).status).toBe(401)
  })

  it("rechaza JSON inválido", async () => {
    const response = await POST(new Request("http://localhost/api/brand-kits", { method: "POST", body: "{" }))
    expect(response.status).toBe(400)
  })

  it("rechaza ownerId y colores inválidos", async () => {
    mocks.getBrandKitSession.mockResolvedValue({ supabase: {}, user: { id: "owner" } })
    const response = await POST(new Request("http://localhost/api/brand-kits", { method: "POST", body: JSON.stringify({ name: "Marca", ownerId: "other", colors: ["purple"] }) }))
    expect(response.status).toBe(422)
    expect(mocks.createBrandKit).not.toHaveBeenCalled()
  })

  it("crea el kit con la identidad de sesión", async () => {
    mocks.getBrandKitSession.mockResolvedValue({ supabase: {}, user: { id: "owner" } })
    mocks.createBrandKit.mockResolvedValue({ id: "kit", name: "Marca" })
    const response = await POST(new Request("http://localhost/api/brand-kits", { method: "POST", body: JSON.stringify({ name: "Marca", colors: ["#8B5CF6"] }) }))
    expect(response.status).toBe(201)
    expect(mocks.createBrandKit).toHaveBeenCalledWith(expect.anything(), "owner", expect.objectContaining({ name: "Marca" }))
  })
})
