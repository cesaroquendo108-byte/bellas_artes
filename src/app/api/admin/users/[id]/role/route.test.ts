import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ requireAdminApiSession: vi.fn(), updateAdminUserRole: vi.fn() }));
vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }));
vi.mock("@/lib/admin/users", () => ({ updateAdminUserRole: mocks.updateAdminUserRole }));

import { PATCH } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
function request(body: unknown) { return new NextRequest(`http://localhost/api/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }); }
function context() { return { params: Promise.resolve({ id }) }; }

describe("PATCH /api/admin/users/:id/role", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige confirmación exacta y motivo", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin-real" } });
    expect((await PATCH(request({ role: "admin", confirmation: "SI", reason: "Cambio controlado" }), context())).status).toBe(422);
    expect(mocks.updateAdminUserRole).not.toHaveBeenCalled();
  });

  it("usa la identidad de sesión y traduce la protección del último admin", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin-real" } });
    const body = { role: "user", confirmation: "CAMBIAR ROL", reason: "Rotación administrativa controlada" };
    mocks.updateAdminUserRole.mockRejectedValueOnce(new Error("No se puede retirar el ultimo administrador"));
    expect((await PATCH(request(body), context())).status).toBe(409);
    expect(mocks.updateAdminUserRole).toHaveBeenCalledWith("admin-real", id, body);
  });
});
