import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/utils/supabase/server", () => ({ createClient: mocks.createClient }))

import { requireAdminApiSession, requireApiSession } from "./auth"

function userQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  }
  mocks.from.mockReturnValue(query)
  return query
}

describe("phase seven API sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: mocks.from })
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
  })

  it("distingue una sesión anónima de una autenticación no disponible", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    await expect(requireApiSession()).resolves.toMatchObject({ ok: false, status: 401 })

    mocks.getUser.mockRejectedValueOnce(new Error("auth unavailable"))
    await expect(requireApiSession()).resolves.toMatchObject({ ok: false, status: 503 })
  })

  it("devuelve 503 si no puede crear el cliente de Supabase", async () => {
    mocks.createClient.mockRejectedValueOnce(new Error("missing runtime"))
    await expect(requireApiSession()).resolves.toMatchObject({ ok: false, status: 503 })
  })

  it("devuelve 503 si falla la consulta del rol, sin propagar el error interno", async () => {
    userQuery({ data: null, error: { message: "database unavailable" } })
    await expect(requireAdminApiSession()).resolves.toMatchObject({ ok: false, status: 503 })
  })

  it("mantiene la separación entre usuario, admin y sesión válida", async () => {
    userQuery({ data: { role: "user" }, error: null })
    await expect(requireAdminApiSession()).resolves.toMatchObject({ ok: false, status: 403 })

    userQuery({ data: { role: "admin" }, error: null })
    await expect(requireAdminApiSession()).resolves.toMatchObject({ ok: true, user: { id: "user-1" } })
  })
})
