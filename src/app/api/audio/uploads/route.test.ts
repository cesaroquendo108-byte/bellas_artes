import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  uploadPrivateObject: vi.fn(),
  getPrivateObjectUrl: vi.fn(),
  deletePrivateObject: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}));
vi.mock("@/lib/storage/r2", () => ({
  uploadPrivateObject: mocks.uploadPrivateObject,
  getPrivateObjectUrl: mocks.getPrivateObjectUrl,
  deletePrivateObject: mocks.deletePrivateObject,
}));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { POST } from "./route";

describe("POST /api/audio/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.uploadPrivateObject.mockResolvedValue(undefined);
    mocks.getPrivateObjectUrl.mockResolvedValue("https://r2.example/signed");
    mocks.deletePrivateObject.mockResolvedValue(undefined);
  });

  it("borra fila y objeto si falla la URL firmada después de insertar", async () => {
    const deleteAsset = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({ data: { id: "asset-1", name: "voz.mp3", type: "audio", mime_type: "audio/mpeg", created_at: "now" }, error: null });
    mocks.getPrivateObjectUrl.mockRejectedValue(new Error("presigner unavailable"));
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: deleteAsset }) }),
      }),
    });

    const form = new FormData();
    form.set("kind", "audio");
    form.set("file", new File([new Uint8Array([1, 2, 3])], "voz.mp3", { type: "audio/mpeg" }));
    const response = await POST(new Request("http://localhost/api/audio/uploads", { method: "POST", body: form }));

    expect(response.status).toBe(503);
    expect(deleteAsset).toHaveBeenCalled();
    expect(mocks.deletePrivateObject).toHaveBeenCalledWith(expect.stringMatching(/^users\/user-1\/audio\//));
  });
});
