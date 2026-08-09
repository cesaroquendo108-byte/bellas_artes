import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getStorySession: vi.fn(),
  listCreativeProjects: vi.fn(),
  createCreativeProject: vi.fn(),
  setCreativeProjectPublication: vi.fn(),
}))

vi.mock("@/lib/story/projects", () => mocks)

import { GET, POST } from "@/app/api/story/projects/route"
import { POST as publish } from "@/app/api/story/projects/[id]/publish/route"

const document = { version: 1, scenes: [] }

describe("Story projects API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getStorySession.mockResolvedValue({ supabase: {}, user: { id: "user-1" } })
    mocks.listCreativeProjects.mockResolvedValue({ projects: [], nextCursor: null })
    mocks.createCreativeProject.mockResolvedValue({ id: "project-1", title: "Mi historia" })
    mocks.setCreativeProjectPublication.mockResolvedValue({ id: "project-1", visibility: "community" })
  })

  it("rechaza usuarios no autenticados", async () => {
    mocks.getStorySession.mockResolvedValue({ supabase: {}, user: null })
    expect((await GET(new Request("http://local/api/story/projects"))).status).toBe(401)
    expect((await POST(new Request("http://local/api/story/projects", { method: "POST", body: "{}" }))).status).toBe(401)
  })

  it("rechaza JSON inválido y userId enviado por cliente", async () => {
    expect((await POST(new Request("http://local/api/story/projects", { method: "POST", body: "{" }))).status).toBe(400)
    const response = await POST(new Request("http://local/api/story/projects", { method: "POST", body: JSON.stringify({ kind: "story", title: "Mi historia", document, userId: "otro" }) }))
    expect(response.status).toBe(422)
    expect(mocks.createCreativeProject).not.toHaveBeenCalled()
  })

  it("crea borradores y lista proyectos con sesión", async () => {
    const created = await POST(new Request("http://local/api/story/projects", { method: "POST", body: JSON.stringify({ kind: "story", title: "Mi historia", storyType: "custom", document }) }))
    expect(created.status).toBe(201)
    expect(mocks.createCreativeProject).toHaveBeenCalledWith({}, "user-1", expect.objectContaining({ kind: "story", title: "Mi historia" }))
    const listed = await GET(new Request("http://local/api/story/projects?kind=story&scope=mine"))
    expect(listed.status).toBe(200)
    expect(mocks.listCreativeProjects).toHaveBeenCalledWith({}, "user-1", expect.objectContaining({ kind: "story", scope: "mine" }))
  })

  it("publica el proyecto del usuario autenticado", async () => {
    const response = await publish(new Request("http://local", { method: "POST" }), { params: Promise.resolve({ id: "project-1" }) })
    expect(response.status).toBe(200)
    expect(mocks.setCreativeProjectPublication).toHaveBeenCalledWith({}, "user-1", "project-1", true)
  })
})
