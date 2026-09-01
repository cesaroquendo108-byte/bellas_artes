import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mocks.from, rpc: mocks.rpc })),
}));

import { POST } from "./route";

const project = {
  name: "Mi proyecto",
  sourceVideoAssetId: null,
  durationMs: 30_000,
  preset: {},
  tracks: [],
};

describe("POST /api/audio/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.rpc.mockResolvedValue({ data: "project-1", error: null });
  });

  it("guarda proyecto y pistas mediante la RPC atómica", async () => {
    const response = await POST(new Request("http://localhost/api/audio/projects", {
      method: "POST",
      body: JSON.stringify(project),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ projectId: "project-1" });
    expect(mocks.rpc).toHaveBeenCalledWith("save_audio_project", expect.objectContaining({
      p_user_id: "user-1",
      p_project_id: null,
      p_tracks: [],
    }));
  });

  it("devuelve 503 si falla la persistencia atómica", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });

    const response = await POST(new Request("http://localhost/api/audio/projects", {
      method: "POST",
      body: JSON.stringify(project),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "PROJECT_SAVE_FAILED" });
  });

  it("no guarda si no puede verificar la propiedad de un asset", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(async () => ({ data: null, error: { message: "assets unavailable" } })),
    };
    mocks.from.mockReturnValue(query);

    const response = await POST(new Request("http://localhost/api/audio/projects", {
      method: "POST",
      body: JSON.stringify({ ...project, sourceVideoAssetId: "00000000-0000-4000-8000-000000000001" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "ASSET_LOOKUP_FAILED" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
