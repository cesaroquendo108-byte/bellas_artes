import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateAdminClient, mockDeletePrivateObject } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockDeletePrivateObject: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/storage/r2", () => ({
  deletePrivateObject: mockDeletePrivateObject,
}));

import { cleanupExpiredAssets } from "./cleanup";

function setupSupabaseMock(options: {
  selectData?: Array<{ id: string; r2_key: string }> | null;
  selectError?: { message: string } | null;
  deleteErrorMap?: Record<string, Error | { message: string } | null>;
}) {
  const { selectData = [], selectError = null, deleteErrorMap = {} } = options;

  const mockLimit = vi.fn().mockResolvedValue({ data: selectData, error: selectError });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockLtSelect = vi.fn().mockReturnValue({ order: mockOrder });
  const mockNot = vi.fn().mockReturnValue({ lt: mockLtSelect });
  const mockSelect = vi.fn().mockReturnValue({ not: mockNot });

  let currentDeleteId: string | null = null;
  const mockLtDelete = vi.fn().mockImplementation(() => {
    const err = currentDeleteId ? (deleteErrorMap[currentDeleteId] ?? null) : null;
    return Promise.resolve({ error: err });
  });

  const mockEq = vi.fn().mockImplementation((_col: string, val: string) => {
    currentDeleteId = val;
    return { lt: mockLtDelete };
  });

  const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    delete: mockDelete,
  });

  const mockAdmin = { from: mockFrom };
  mockCreateAdminClient.mockReturnValue(mockAdmin);

  return {
    mockAdmin,
    mockFrom,
    mockSelect,
    mockNot,
    mockLtSelect,
    mockOrder,
    mockLimit,
    mockDelete,
    mockEq,
    mockLtDelete,
  };
}

describe("Empirical Stress Testing: cleanupExpiredAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Limit parameter boundary and edge cases", () => {
    it("handles limit = NaN (returns safeLimit = NaN to query builder)", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });
      await cleanupExpiredAssets(NaN);
      expect(mockLimit).toHaveBeenCalledWith(NaN);
    });

    it("handles limit = string 'abc' (returns safeLimit = NaN)", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });
      await cleanupExpiredAssets("abc" as unknown as number);
      expect(mockLimit).toHaveBeenCalledWith(NaN);
    });

    it("handles limit = null (Math.trunc(null) is 0 -> safeLimit = 1)", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });
      await cleanupExpiredAssets(null as unknown as number);
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it("handles extreme large limit = 1e9 (caps at MAX_LIMIT = 500)", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });
      await cleanupExpiredAssets(1e9);
      expect(mockLimit).toHaveBeenCalledWith(500);
    });

    it("handles negative limit = -999 (floors at 1)", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });
      await cleanupExpiredAssets(-999);
      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  describe("Batch processing and resilience under load", () => {
    it("handles 500 items in a single batch without failure", async () => {
      const largeBatch = Array.from({ length: 500 }, (_, i) => ({
        id: `asset-${i}`,
        r2_key: `keys/file-${i}.png`,
      }));
      setupSupabaseMock({ selectData: largeBatch });
      mockDeletePrivateObject.mockResolvedValue(undefined);

      const result = await cleanupExpiredAssets(500);

      expect(result.scanned).toBe(500);
      expect(result.deleted).toBe(500);
      expect(result.failures).toHaveLength(0);
      expect(mockDeletePrivateObject).toHaveBeenCalledTimes(500);
    });

    it("resiliently processes mix of R2 failures, DB failures, and non-Error objects", async () => {
      const batch = Array.from({ length: 10 }, (_, i) => ({
        id: `asset-${i}`,
        r2_key: `keys/file-${i}.png`,
      }));

      setupSupabaseMock({
        selectData: batch,
        deleteErrorMap: {
          "asset-3": new Error("DB Lock Timeout"),
          "asset-7": { message: "Foreign Key Constraint Failure" } as unknown as Error, // Plain object
        },
      });

      // R2 fails for asset-1 (Error) and asset-5 (primitive string)
      mockDeletePrivateObject.mockImplementation((key: string) => {
        if (key === "keys/file-1.png") return Promise.reject(new Error("R2 503 Timeout"));
        if (key === "keys/file-5.png") return Promise.reject("Network Dropped");
        return Promise.resolve();
      });

      const result = await cleanupExpiredAssets(10);

      expect(result.scanned).toBe(10);
      expect(result.deleted).toBe(6); // 10 total - 2 R2 fails - 2 DB fails = 6
      expect(result.failures).toEqual([
        { id: "asset-1", reason: "R2 503 Timeout" },
        { id: "asset-3", reason: "DB Lock Timeout" },
        { id: "asset-5", reason: "Error desconocido" },
        { id: "asset-7", reason: "Error desconocido" }, // Plain object { message } triggers fallback
      ]);
    });
  });

  describe("Database initial query error handling", () => {
    it("throws clear error when Supabase select query fails", async () => {
      setupSupabaseMock({
        selectData: null,
        selectError: { message: "FATAL: connection limit exceeded" },
      });

      await expect(cleanupExpiredAssets()).rejects.toThrow(
        "No se pudieron consultar los assets vencidos: FATAL: connection limit exceeded",
      );
    });
  });
});
