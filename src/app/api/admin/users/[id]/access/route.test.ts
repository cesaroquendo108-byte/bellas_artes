import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ requireAdminApiSession: vi.fn(), updateAdminUserAccess: vi.fn() }));
vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }));
vi.mock("@/lib/admin/users", () => ({ updateAdminUserAccess: mocks.updateAdminUserAccess }));

import { PATCH } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
function request(body: unknown) { return new NextRequest(`http://localhost/api/admin/users/${id}/access`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }); }
function context(value = id) { return { params: Promise.resolve({ id: value }) }; }

describe("PATCH /api/admin/users/:id/access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requiere admin y valida modalidades y motivo", async () => {
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await PATCH(request({}), context())).status).toBe(401);
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin-real" } });
    expect((await PATCH(request({ accessLevel: "beta", allowedKinds: [], enabled: true, expiresAt: null, reason: "corto" }), context())).status).toBe(422);
    expect(mocks.updateAdminUserAccess).not.toHaveBeenCalled();
  });

  it("usa el actor autenticado y registra un grant válido", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin-real" } });
    mocks.updateAdminUserAccess.mockResolvedValue({ userId: id, enabled: true });
    const body = { accessLevel: "beta", allowedKinds: ["image"], enabled: true, expiresAt: null, reason: "Invitación de beta controlada" };
    const response = await PATCH(request(body), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(mocks.updateAdminUserAccess).toHaveBeenCalledWith("admin-real", id, body);
  });
});
