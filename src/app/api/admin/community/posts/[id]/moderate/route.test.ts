import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireAdminApiSession: vi.fn(),
  moderateCommunityPost: vi.fn(),
}))

vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }))
vi.mock("@/lib/social/posts", () => ({ moderateCommunityPost: mocks.moderateCommunityPost }))

import { POST } from "./route"

const context = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) }

describe("POST /api/admin/community/posts/[id]/moderate", () => {
  beforeEach(() => vi.clearAllMocks())

  it("devuelve 401 sin sesión y 403 sin rol admin", async () => {
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 401 })
    const unauthorized = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ decision: "approve" }) }), context)
    expect(unauthorized.status).toBe(401)

    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 403 })
    const forbidden = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ decision: "approve" }) }), context)
    expect(forbidden.status).toBe(403)
  })

  it("modera con la identidad del administrador", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin" }, supabase: {} })
    mocks.moderateCommunityPost.mockResolvedValue({ id: "post", status: "published" })
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ decision: "approve" }) }), context)
    expect(response.status).toBe(200)
    expect(mocks.moderateCommunityPost).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "admin", { decision: "approve" })
  })
})
