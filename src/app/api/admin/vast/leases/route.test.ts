import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ requireVastAdminApiSession: vi.fn(), createVastAdminLease: vi.fn() }));
vi.mock("@/lib/admin/vast-api-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/vast-api-auth")>("@/lib/admin/vast-api-auth");
  return { ...actual, requireVastAdminApiSession: mocks.requireVastAdminApiSession };
});
vi.mock("@/lib/admin/vast-service", () => ({ createVastAdminLease: mocks.createVastAdminLease }));

import { POST } from "./route";

function request(body: unknown, origin = "https://bellasartes-xi.vercel.app") {
  return new NextRequest("https://bellasartes-xi.vercel.app/api/admin/vast/leases", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

const valid = {
  requestId: "11111111-1111-4111-8111-111111111111",
  offerId: 91,
  preset: "comfy-clean",
  market: "on-demand",
  ttlMinutes: 15,
  confirmation: "ALQUILAR GPU",
};

describe("POST /api/admin/vast/leases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("conserva la respuesta de autorización", async () => {
    mocks.requireVastAdminApiSession.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
    expect((await POST(request(valid))).status).toBe(403);
  });

  it("exige confirmación y no acepta parámetros arbitrarios", async () => {
    mocks.requireVastAdminApiSession.mockResolvedValue({ ok: true, session: { user: { id: "admin" } } });
    expect((await POST(request({ ...valid, confirmation: "SI" }))).status).toBe(422);
    expect((await POST(request({ ...valid, image: "evil/image" }))).status).toBe(422);
    expect(mocks.createVastAdminLease).not.toHaveBeenCalled();
  });

  it("usa el actor de sesión y devuelve 202 al reconciliar", async () => {
    mocks.requireVastAdminApiSession.mockResolvedValue({ ok: true, session: { user: { id: "admin-real" } } });
    mocks.createVastAdminLease.mockResolvedValue({ id: "lease", state: "reconciling" });
    const response = await POST(request(valid));
    expect(response.status).toBe(202);
    expect(mocks.createVastAdminLease).toHaveBeenCalledWith(valid, "admin-real");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
  });
});
