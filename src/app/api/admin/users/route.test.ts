import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ requireAdminApiSession: vi.fn(), listAdminUsers: vi.fn() }));
vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }));
vi.mock("@/lib/admin/users", () => ({ listAdminUsers: mocks.listAdminUsers }));

import { GET } from "./route";

describe("GET /api/admin/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 401 y 403 según la sesión", async () => {
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await GET(new NextRequest("http://localhost/api/admin/users"))).status).toBe(401);
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 403 });
    expect((await GET(new NextRequest("http://localhost/api/admin/users"))).status).toBe(403);
  });

  it("valida filtros, limita tamaño y deshabilita caché", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin" } });
    expect((await GET(new NextRequest("http://localhost/api/admin/users?pageSize=99"))).status).toBe(422);
    mocks.listAdminUsers.mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 20, pageCount: 1 });
    const response = await GET(new NextRequest("http://localhost/api/admin/users?search=ana&role=user"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(mocks.listAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ search: "ana", role: "user", pageSize: 20 }));
  });
});
