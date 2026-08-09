import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { createServerClient, getUser } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({ createServerClient }))

import { updateSession } from "./middleware"

describe("Supabase session middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("mantiene disponibles las páginas públicas sin Supabase configurado", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    const response = await updateSession(new NextRequest("https://example.test/blog"))
    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-next")).toBe("1")
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it("redirige superficies privadas conservando el destino", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    const response = await updateSession(new NextRequest("https://example.test/brand-kits"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://example.test/login?next=%2Fbrand-kits")
  })

  it("renueva una sesión configurada y respeta next al visitar login", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    getUser.mockResolvedValue({ data: { user: { id: "user" } } })
    createServerClient.mockReturnValue({ auth: { getUser } })
    const response = await updateSession(new NextRequest("https://example.test/login?next=%2Fbrand-kits"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://example.test/brand-kits")
  })

  it("conserva los query params de un destino local", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    getUser.mockResolvedValue({ data: { user: { id: "user" } } })
    createServerClient.mockReturnValue({ auth: { getUser } })
    const destination = encodeURIComponent("/inspire?remix=11111111-1111-4111-8111-111111111111")
    const response = await updateSession(new NextRequest(`https://example.test/login?next=${destination}`))
    expect(response.headers.get("location")).toBe("https://example.test/inspire?remix=11111111-1111-4111-8111-111111111111")
  })
})
