import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCleanupExpiredAssets = vi.fn();

vi.mock("@/lib/assets/cleanup", () => ({
  cleanupExpiredAssets: () => mockCleanupExpiredAssets(),
}));

import { GET } from "./route";

describe("Empirical Stress Testing: GET /api/cron/assets-retention", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 503 if CRON_SECRET is undefined", async () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest("http://localhost/api/cron/assets-retention");
    const res = await GET(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "La limpieza programada no está configurada." });
  });

  it("returns 503 if CRON_SECRET is empty string", async () => {
    process.env.CRON_SECRET = "";
    const req = new NextRequest("http://localhost/api/cron/assets-retention");
    const res = await GET(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "La limpieza programada no está configurada." });
  });

  it("returns 401 for various bad authorization headers", async () => {
    process.env.CRON_SECRET = "secret_token_123";

    const badHeaders = [
      "", // missing header
      "Bearer ", // empty token
      "Bearer secret_token_12", // truncated
      "Bearer secret_token_1234", // over-extended
      "bearer secret_token_123", // lowercase bearer
      "BEARER secret_token_123", // uppercase bearer
      "Bearer  secret_token_123", // double space
      "Token secret_token_123", // wrong scheme
    ];

    for (const header of badHeaders) {
      const req = new NextRequest("http://localhost/api/cron/assets-retention", {
        headers: header ? { authorization: header } : {},
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "No autorizado." });
    }
  });

  it("returns 200 with result payload on matching Bearer secret", async () => {
    process.env.CRON_SECRET = "secret_token_123";
    mockCleanupExpiredAssets.mockResolvedValueOnce({
      scanned: 100,
      deleted: 95,
      failures: [{ id: "asset-10", reason: "R2 error" }],
    });

    const req = new NextRequest("http://localhost/api/cron/assets-retention", {
      headers: { authorization: "Bearer secret_token_123" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      scanned: 100,
      deleted: 95,
      failures: [{ id: "asset-10", reason: "R2 error" }],
    });
  });

  it("returns 500 when cleanupExpiredAssets throws primitive value (null, number, object)", async () => {
    process.env.CRON_SECRET = "secret_token_123";

    const primitives = [null, undefined, 404, { customError: "failed" }];

    for (const prim of primitives) {
      mockCleanupExpiredAssets.mockRejectedValueOnce(prim);
      const req = new NextRequest("http://localhost/api/cron/assets-retention", {
        headers: { authorization: "Bearer secret_token_123" },
      });
      const res = await GET(req);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "No se pudo completar la limpieza." });
    }
  });
});
