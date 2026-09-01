import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  deletePrivateObject: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ from: mocks.from })) }));
vi.mock("@/lib/storage/r2", () => ({ deletePrivateObject: mocks.deletePrivateObject }));

import { DELETE } from "./route";

describe("DELETE /api/audio/assets/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.deletePrivateObject.mockResolvedValue(undefined);
  });

  it("conserva la fila si falla la eliminación del objeto privado", async () => {
    const assetQuery = {
      select: vi.fn(() => assetQuery),
      eq: vi.fn(() => assetQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "asset-1", r2_key: "users/user-1/audio/file.mp3" }, error: null }),
    };
    mocks.from.mockReturnValue(assetQuery);
    mocks.deletePrivateObject.mockRejectedValue(new Error("R2 unavailable"));

    const response = await DELETE(new Request("http://localhost/api/audio/assets/asset-1", { method: "DELETE" }), { params: Promise.resolve({ id: "asset-1" }) });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "STORAGE_DELETE_FAILED" });
  });

  it("elimina el registro después de eliminar el objeto", async () => {
    const deleteRow = vi.fn().mockResolvedValue({ error: null });
    const assetQuery = {
      select: vi.fn(() => assetQuery),
      eq: vi.fn(() => assetQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "asset-1", r2_key: "users/user-1/audio/file.mp3" }, error: null }),
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: deleteRow })) })),
    };
    mocks.from.mockReturnValue(assetQuery);

    const response = await DELETE(new Request("http://localhost/api/audio/assets/asset-1", { method: "DELETE" }), { params: Promise.resolve({ id: "asset-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.deletePrivateObject).toHaveBeenCalledWith("users/user-1/audio/file.mp3");
    expect(deleteRow).toHaveBeenCalled();
  });
});
