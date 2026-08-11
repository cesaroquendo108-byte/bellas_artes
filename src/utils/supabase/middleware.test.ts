import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { createServerClient, getUser } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}))

const validAnonKey = "a".repeat(48)

vi.mock("@supabase/ssr", () => ({ createServerClient }))

import { updateSession } from "./middleware"

describe("Supabase session middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("redirige el callback OAuth heredado de la raíz sin consultar Supabase", async () => {
    const response = await updateSession(new NextRequest(
      "https://example.test/?code=oauth-code&state=state-123&ignored=value",
    ))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://example.test/auth/callback?code=oauth-code&state=state-123",
    )
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it("redirige errores OAuth heredados de la raíz al callback", async () => {
    const response = await updateSession(new NextRequest(
      "https://example.test/?error=access_denied&error_description=User%20cancelled",
    ))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://example.test/auth/callback?error=access_denied&error_description=User+cancelled",
    )
    expect(createServerClient).not.toHaveBeenCalled()
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
    expect(response.headers.get("location")).toBe("https://example.test/login?config=missing&next=%2Fbrand-kits")
  })

  it("protege las rutas de Audio cuando falta Supabase", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    const response = await updateSession(new NextRequest("https://example.test/audio/my"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("next=%2Faudio%2Fmy")
  })

  it("rechaza URLs no HTTPS y claves públicas evidentemente incompletas", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://project.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
    const response = await updateSession(new NextRequest("https://example.test/dashboard"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("config=missing")
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it("renueva una sesión configurada y respeta next al visitar login", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey)
    getUser.mockResolvedValue({ data: { user: { id: "user" } } })
    createServerClient.mockReturnValue({ auth: { getUser } })
    const response = await updateSession(new NextRequest("https://example.test/login?next=%2Fbrand-kits"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://example.test/brand-kits")
  })

  it("no hace un round trip de sesión en una página pública configurada", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey)

    const response = await updateSession(new NextRequest("https://example.test/blog"))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-next")).toBe("1")
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it("conserva los query params de un destino local", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey)
    getUser.mockResolvedValue({ data: { user: { id: "user" } } })
    createServerClient.mockReturnValue({ auth: { getUser } })
    const destination = encodeURIComponent("/inspire?remix=11111111-1111-4111-8111-111111111111")
    const response = await updateSession(new NextRequest(`https://example.test/login?next=${destination}`))
    expect(response.headers.get("location")).toBe("https://example.test/inspire?remix=11111111-1111-4111-8111-111111111111")
  })
})
