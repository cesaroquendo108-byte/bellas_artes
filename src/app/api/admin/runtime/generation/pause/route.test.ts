import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  requireAdminApiSession: vi.fn(),
  pauseGenerationRuntime: vi.fn(),
}));
vi.mock("@/lib/phase7/auth", () => ({ requireAdminApiSession: mocks.requireAdminApiSession }));
vi.mock("@/lib/admin/runtime-controls", () => ({ pauseGenerationRuntime: mocks.pauseGenerationRuntime }));

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/runtime/generation/pause", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/runtime/generation/pause", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza usuarios no autenticados o sin rol", async () => {
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await POST(request({}))).status).toBe(401);
    mocks.requireAdminApiSession.mockResolvedValueOnce({ ok: false, status: 403 });
    expect((await POST(request({}))).status).toBe(403);
  });

  it("exige motivo y confirmación exacta", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin-id" } });
    expect((await POST(request({ reason: "muy corto", confirmation: "PAUSAR" }))).status).toBe(422);
    expect(mocks.pauseGenerationRuntime).not.toHaveBeenCalled();
  });

  it("usa la identidad de sesión y no acepta userId del cliente", async () => {
    mocks.requireAdminApiSession.mockResolvedValue({ ok: true, user: { id: "admin-real" } });
    mocks.pauseGenerationRuntime.mockResolvedValue({ emergencyPaused: true, changed: true });
    const response = await POST(request({
      reason: "Incidente operativo controlado",
      confirmation: "PAUSAR GENERACION",
    }));
    expect(response.status).toBe(200);
    expect(mocks.pauseGenerationRuntime).toHaveBeenCalledWith("admin-real", "Incidente operativo controlado");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
  });
});
