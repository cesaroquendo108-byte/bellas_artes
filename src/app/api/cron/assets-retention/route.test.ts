import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCleanupExpiredAssets = vi.fn();
const mockRecordServiceHeartbeat = vi.fn();

vi.mock("@/lib/assets/cleanup", () => ({
  cleanupExpiredAssets: () => mockCleanupExpiredAssets(),
}));
vi.mock("@/lib/admin/service-heartbeats", () => ({
  recordServiceHeartbeat: (input: unknown) => {
    mockRecordServiceHeartbeat(input);
    return Promise.resolve();
  },
}));

import { GET } from "./route";

describe("GET /api/cron/assets-retention", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 503 if CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;

    const request = new NextRequest(
      "http://localhost/api/cron/assets-retention",
    );
    const response = await GET(request);

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toEqual({
      error: "La limpieza programada no está configurada.",
    });
    expect(mockCleanupExpiredAssets).not.toHaveBeenCalled();
  });

  it("should return 401 if authorization header is missing", async () => {
    process.env.CRON_SECRET = "secret_token_123";

    const request = new NextRequest(
      "http://localhost/api/cron/assets-retention",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ error: "No autorizado." });
    expect(mockCleanupExpiredAssets).not.toHaveBeenCalled();
  });

  it("should return 401 if authorization header is invalid or mismatched", async () => {
    process.env.CRON_SECRET = "secret_token_123";

    const invalidHeaderRequest = new NextRequest(
      "http://localhost/api/cron/assets-retention",
      {
        headers: { authorization: "Bearer wrong_secret" },
      },
    );
    const response1 = await GET(invalidHeaderRequest);

    expect(response1.status).toBe(401);
    const data1 = await response1.json();
    expect(data1).toEqual({ error: "No autorizado." });

    const nonBearerRequest = new NextRequest(
      "http://localhost/api/cron/assets-retention",
      {
        headers: { authorization: "Basic secret_token_123" },
      },
    );
    const response2 = await GET(nonBearerRequest);

    expect(response2.status).toBe(401);
    expect(mockCleanupExpiredAssets).not.toHaveBeenCalled();
  });

  it("should return 200 and JSON summary when CRON_SECRET matches and cleanup succeeds", async () => {
    process.env.CRON_SECRET = "secret_token_123";
    const expectedResult = {
      scanned: 5,
      deleted: 4,
      failures: [{ id: "ast-3", reason: "Storage timeout" }],
    };
    mockCleanupExpiredAssets.mockResolvedValueOnce(expectedResult);

    const request = new NextRequest(
      "http://localhost/api/cron/assets-retention",
      {
        headers: { authorization: "Bearer secret_token_123" },
      },
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(expectedResult);
    expect(mockCleanupExpiredAssets).toHaveBeenCalledTimes(1);
  });

  it("should return 500 on standard Error exception from cleanupExpiredAssets", async () => {
    process.env.CRON_SECRET = "secret_token_123";
    mockCleanupExpiredAssets.mockRejectedValueOnce(
      new Error("Supabase connection timeout"),
    );

    const request = new NextRequest(
      "http://localhost/api/cron/assets-retention",
      {
        headers: { authorization: "Bearer secret_token_123" },
      },
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "Supabase connection timeout" });
  });

  it("should return 500 on non-Error exception from cleanupExpiredAssets", async () => {
    process.env.CRON_SECRET = "secret_token_123";
    mockCleanupExpiredAssets.mockRejectedValueOnce("Unknown primitive failure");

    const request = new NextRequest(
      "http://localhost/api/cron/assets-retention",
      {
        headers: { authorization: "Bearer secret_token_123" },
      },
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "No se pudo completar la limpieza." });
  });
});
