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

describe("lib/assets/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bounds checking en el parámetro limit", () => {
    it("usa el valor predeterminado 100 si no se pasa limit", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });

      await cleanupExpiredAssets();

      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it("limita a 1 cuando se pasa un valor menor que 1 (ej: 0 o negativo)", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });

      await cleanupExpiredAssets(0);
      expect(mockLimit).toHaveBeenCalledWith(1);

      await cleanupExpiredAssets(-50);
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it("limita al máximo de 500 cuando se pasa un valor superior", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });

      await cleanupExpiredAssets(1000);

      expect(mockLimit).toHaveBeenCalledWith(500);
    });

    it("trunca números decimales para el límite (ej: 45.7 -> 45)", async () => {
      const { mockLimit } = setupSupabaseMock({ selectData: [] });

      await cleanupExpiredAssets(45.7);

      expect(mockLimit).toHaveBeenCalledWith(45);
    });
  });

  describe("manejo de errores al consultar assets", () => {
    it("lanza un error si la consulta a Supabase falla", async () => {
      setupSupabaseMock({
        selectData: null,
        selectError: { message: "Error de conexión con base de datos" },
      });

      await expect(cleanupExpiredAssets()).rejects.toThrow(
        "No se pudieron consultar los assets vencidos: Error de conexión con base de datos",
      );
    });
  });

  describe("eliminación de assets vencidos", () => {
    it("retorna 0 escaneados y 0 eliminados cuando no hay assets expirados", async () => {
      setupSupabaseMock({ selectData: [] });

      const result = await cleanupExpiredAssets();

      expect(result).toEqual({ scanned: 0, deleted: 0, failures: [] });
      expect(mockDeletePrivateObject).not.toHaveBeenCalled();
    });

    it("elimina exitosamente assets expirados de R2 y de la base de datos", async () => {
      const sampleAssets = [
        { id: "asset-1", r2_key: "keys/file1.png" },
        { id: "asset-2", r2_key: "keys/file2.jpg" },
      ];
      setupSupabaseMock({ selectData: sampleAssets });
      mockDeletePrivateObject.mockResolvedValue(undefined);

      const result = await cleanupExpiredAssets(10);

      expect(result).toEqual({ scanned: 2, deleted: 2, failures: [] });
      expect(mockDeletePrivateObject).toHaveBeenCalledTimes(2);
      expect(mockDeletePrivateObject).toHaveBeenNthCalledWith(1, "keys/file1.png");
      expect(mockDeletePrivateObject).toHaveBeenNthCalledWith(2, "keys/file2.jpg");
    });

    it("registra fallos en R2 sin interrumpir la eliminación de los demás assets", async () => {
      const sampleAssets = [
        { id: "asset-1", r2_key: "keys/file1.png" },
        { id: "asset-2", r2_key: "keys/fail.png" },
        { id: "asset-3", r2_key: "keys/file3.png" },
      ];
      setupSupabaseMock({ selectData: sampleAssets });

      mockDeletePrivateObject
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("R2 bucket object locked"))
        .mockResolvedValueOnce(undefined);

      const result = await cleanupExpiredAssets();

      expect(result).toEqual({
        scanned: 3,
        deleted: 2,
        failures: [{ id: "asset-2", reason: "R2 bucket object locked" }],
      });
    });

    it("registra fallos en la eliminación de la base de datos", async () => {
      const sampleAssets = [
        { id: "asset-1", r2_key: "keys/file1.png" },
        { id: "asset-2", r2_key: "keys/file2.png" },
      ];
      setupSupabaseMock({
        selectData: sampleAssets,
        deleteErrorMap: {
          "asset-2": new Error("ForeignKey constraint violation"),
        },
      });
      mockDeletePrivateObject.mockResolvedValue(undefined);

      const result = await cleanupExpiredAssets();

      expect(result).toEqual({
        scanned: 2,
        deleted: 1,
        failures: [{ id: "asset-2", reason: "ForeignKey constraint violation" }],
      });
    });

    it("maneja excepciones que no son de tipo Error en el bloque catch", async () => {
      const sampleAssets = [{ id: "asset-1", r2_key: "keys/file1.png" }];
      setupSupabaseMock({ selectData: sampleAssets });

      mockDeletePrivateObject.mockRejectedValueOnce("String error exception");

      const result = await cleanupExpiredAssets();

      expect(result).toEqual({
        scanned: 1,
        deleted: 0,
        failures: [{ id: "asset-1", reason: "Error desconocido" }],
      });
    });
  });
});
