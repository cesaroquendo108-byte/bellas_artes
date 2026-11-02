import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/admin/model-packs", () => {
  it("returns all available model packs", async () => {
    const req = new Request("http://localhost:3000/api/admin/model-packs");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(4);
    expect(data.packs.length).toBe(data.count);
  });

  it("returns specific pack details with generated bash script", async () => {
    const req = new Request("http://localhost:3000/api/admin/model-packs?id=gesture-portal-flux&script=true");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pack.id).toBe("gesture-portal-flux");
    expect(data.script).toContain("#!/usr/bin/env bash");
    expect(data.script).toContain("flux2_klein_4b_distill_fp8.safetensors");
  });

  it("returns 404 for unknown pack id", async () => {
    const req = new Request("http://localhost:3000/api/admin/model-packs?id=non_existent_pack");
    const res = await GET(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("no existe");
  });
});
