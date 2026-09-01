import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUpload, mockDelete, mockInsert, mockCreateAdminClient } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockDelete: vi.fn(),
  mockInsert: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage/r2", () => ({
  uploadPrivateObject: mockUpload,
  deletePrivateObject: mockDelete,
}));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: mockCreateAdminClient }));

import { persistGenerationOutput } from "./output";

describe("persistGenerationOutput", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reutiliza un output existente sin volver a subirlo", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "asset-existing", user_id: "user-1" }, error: null });
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
      }),
    });

    await expect(persistGenerationOutput({
      userId: "user-1",
      jobId: "job-1",
      kind: "image",
      result: { contentType: "image/png", bytes: new Uint8Array([1, 2, 3]), filename: "salida.png" },
    })).resolves.toBe("asset-existing");

    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("elimina el objeto privado si falla el registro en la base de datos", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpload.mockResolvedValue("users/user/generated/image/job.png");
    mockDelete.mockResolvedValue(undefined);
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
        insert: mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
      }),
    });

    await expect(persistGenerationOutput({
      userId: "user-1",
      jobId: "job-1",
      kind: "image",
      result: { contentType: "image/png", bytes: new Uint8Array([1, 2, 3]), filename: "salida.png" },
    })).rejects.toThrow("insert failed");

    expect(mockDelete).toHaveBeenCalledWith(expect.stringMatching(/^users\/user-1\/generated\/image\/job-1-/));
  });
});
