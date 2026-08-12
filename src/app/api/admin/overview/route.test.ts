import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  requireAdminApiSession: vi.fn(),
  getAdminDashboardSnapshot: vi.fn(),
}));
vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }));
vi.mock("@/lib/admin/dashboard", () => ({ getAdminDashboardSnapshot: mocks.getAdminDashboardSnapshot }));

import { GET } from "./route";

describe("GET /api/admin/overview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 401 sin sesión y 403 sin rol admin", async () => {
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await GET(new NextRequest("http://localhost/api/admin/overview"))).status).toBe(401);
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 403 });
    expect((await GET(new NextRequest("http://localhost/api/admin/overview"))).status).toBe(403);
  });

  it("normaliza la ventana y deshabilita caché privada", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin" } });
    mocks.getAdminDashboardSnapshot.mockResolvedValue({ window: "24h", generatedAt: "now" });
    const response = await GET(new NextRequest("http://localhost/api/admin/overview?window=90d"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(mocks.getAdminDashboardSnapshot).toHaveBeenCalledWith("24h");
  });

  it("no filtra errores internos como stack traces", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin" } });
    mocks.getAdminDashboardSnapshot.mockRejectedValue(new Error("Métricas no disponibles"));
    const response = await GET(new NextRequest("http://localhost/api/admin/overview"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ errorCode: "ADMIN_DASHBOARD_UNAVAILABLE", message: "Métricas no disponibles" });
  });
});
