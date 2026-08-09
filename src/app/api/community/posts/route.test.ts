import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createCommunityPost: vi.fn(),
  getSocialSession: vi.fn(),
  listPublishedPosts: vi.fn(),
}))

vi.mock("@/lib/social/posts", () => mocks)

import { GET, POST } from "./route"

const valid = {
  assetId: "11111111-1111-4111-8111-111111111111",
  title: "Campaña",
  category: "marketing-advertising",
  directPayload: { kind: "image", targetPath: "/image" },
}

describe("/api/community/posts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("permite leer el feed público paginado", async () => {
    mocks.getSocialSession.mockResolvedValue({ supabase: {} as never, user: null })
    mocks.listPublishedPosts.mockResolvedValue({ posts: [], nextCursor: null })
    const response = await GET(new Request("http://localhost/api/community/posts?limit=12"))
    expect(response.status).toBe(200)
    expect(mocks.listPublishedPosts).toHaveBeenCalledWith(expect.anything(), { limit: 12 })
  })

  it("rechaza crear sin sesión", async () => {
    mocks.getSocialSession.mockResolvedValue({ supabase: {}, user: null })
    const response = await POST(new Request("http://localhost/api/community/posts", { method: "POST", body: JSON.stringify(valid) }))
    expect(response.status).toBe(401)
  })

  it("rechaza identidad enviada por el cliente", async () => {
    mocks.getSocialSession.mockResolvedValue({ supabase: {}, user: { id: "owner" } })
    const response = await POST(new Request("http://localhost/api/community/posts", { method: "POST", body: JSON.stringify({ ...valid, authorId: "other" }) }))
    expect(response.status).toBe(422)
    expect(mocks.createCommunityPost).not.toHaveBeenCalled()
  })

  it("crea una publicación pendiente para el usuario de sesión", async () => {
    mocks.getSocialSession.mockResolvedValue({ supabase: {}, user: { id: "owner" } })
    mocks.createCommunityPost.mockResolvedValue({ id: "post", status: "pending" })
    const response = await POST(new Request("http://localhost/api/community/posts", { method: "POST", body: JSON.stringify(valid) }))
    expect(response.status).toBe(201)
    expect(mocks.createCommunityPost).toHaveBeenCalledWith(expect.anything(), "owner", expect.objectContaining({ title: "Campaña" }))
    await expect(response.json()).resolves.toMatchObject({ post: { status: "pending" } })
  })
})
