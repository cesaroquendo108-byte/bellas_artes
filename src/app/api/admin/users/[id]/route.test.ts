import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ requireAdminApiSession: vi.fn(), getAdminUserDetail: vi.fn() }));
vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }));
vi.mock("@/lib/admin/users", () => ({
  AdminUserNotFoundError: class AdminUserNotFoundError extends Error {},
  getAdminUserDetail: mocks.getAdminUserDetail,
}));

import { GET } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const request = new NextRequest(`http://localhost/api/admin/users/${id}`);
const context = { params: Promise.resolve({ id }) };

describe("GET /api/admin/users/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza sesiones sin permisos", async () => {
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await GET(request, context)).status).toBe(401);
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 403 });
    expect((await GET(request, context)).status).toBe(403);
  });

  it("devuelve sólo el DTO administrativo con caché deshabilitada", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin" } });
    mocks.getAdminUserDetail.mockResolvedValue({ id, email: "persona@example.com", recentJobs: [], auditEvents: [] });
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(await response.json()).toEqual({ user: { id, email: "persona@example.com", recentJobs: [], auditEvents: [] } });
  });
});
