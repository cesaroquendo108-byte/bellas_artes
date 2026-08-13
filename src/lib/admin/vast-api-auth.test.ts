import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ requireAdminApiSession: vi.fn() }));
vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }));

import { requireSameOrigin, requireVastAdminApiSession } from "./vast-api-auth";

describe("autorización de la consola Vast", () => {
  beforeEach(() => {
    vi.stubEnv("VAST_ADMIN_OPERATOR_EMAIL", "cesaroquendo10@gmail.com");
    mocks.requireAdminApiSession.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("conserva 401/403 del control administrativo", async () => {
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 401 });
    const unauthenticated = await requireVastAdminApiSession();
    expect(unauthenticated.ok).toBe(false);
    if (!unauthenticated.ok) expect(unauthenticated.response.status).toBe(401);
  });

  it("exige además el correo operador exacto", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin", email: "otro@example.com" } });
    const forbidden = await requireVastAdminApiSession();
    expect(forbidden.ok).toBe(false);
    if (!forbidden.ok) expect(forbidden.response.status).toBe(403);

    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin", email: "CESAROQUENDO10@gmail.com" } });
    await expect(requireVastAdminApiSession()).resolves.toMatchObject({ ok: true });
  });

  it("rechaza POST sin Origin o desde otro dominio", () => {
    expect(() => requireSameOrigin(new NextRequest("https://bellasartes-xi.vercel.app/api/admin/vast/leases", { method: "POST" }))).toThrow("desde Bellas Artes");
    expect(() => requireSameOrigin(new NextRequest("https://bellasartes-xi.vercel.app/api/admin/vast/leases", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    }))).toThrow("no está autorizado");
    expect(() => requireSameOrigin(new NextRequest("https://bellasartes-xi.vercel.app/api/admin/vast/leases", {
      method: "POST",
      headers: { origin: "https://bellasartes-xi.vercel.app" },
    }))).not.toThrow();
  });
});
