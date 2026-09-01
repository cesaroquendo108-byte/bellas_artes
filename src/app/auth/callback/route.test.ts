import { describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/utils/supabase/server", () => ({ createClient }));

import { GET } from "./route";

describe("OAuth callback route", () => {
  it("turns provider errors into a safe login message", async () => {
    const response = await GET(new Request("https://example.test/auth/callback?error=access_denied"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?message=No%20se%20pudo%20completar%20la%20autenticaci%C3%B3n%20con%20Google",
    );
  });

  it("does not attempt a session exchange without an authorization code", async () => {
    const response = await GET(new Request("https://example.test/auth/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?message=No%20se%20proporcion%C3%B3%20c%C3%B3digo%20de%20autorizaci%C3%B3n",
    );
  });

  it("redirige al login si Supabase no está disponible durante el intercambio", async () => {
    createClient.mockRejectedValueOnce(new Error("supabase unavailable"));
    const response = await GET(new Request("https://example.test/auth/callback?code=oauth-code"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?message=La%20autenticaci%C3%B3n%20no%20est%C3%A1%20disponible%20temporalmente.",
    );
  });
});
