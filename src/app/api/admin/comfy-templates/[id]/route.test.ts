import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/vast-api-auth", () => ({
  privateNoStoreHeaders: () => ({ "Cache-Control": "private, no-store, max-age=0" }),
  requireVastAdminApiSession: vi.fn(async () => ({
    ok: true as const,
    session: { user: { id: "operator", email: "operator@example.com" } },
  })),
  vastAdminErrorResponse: () => NextResponse.json({}, { status: 503 }),
}));

import { GET } from "./route";

describe("admin ComfyUI template download", () => {
  it("returns the pinned JSON with private integrity headers", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/comfy-templates/flux-schnell-full-t2i"),
      { params: Promise.resolve({ id: "flux-schnell-full-t2i" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("content-disposition")).toContain("bellas-artes-flux-schnell-full-t2i.json");
    expect(response.headers.get("x-comfy-template-sha256")).toMatch(/^[a-f0-9]{64}$/);
    const workflow = JSON.parse(await response.text()) as { nodes?: unknown[] };
    expect(workflow.nodes?.length).toBeGreaterThan(0);
  });

  it("fails closed for an unknown template id", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/comfy-templates/not-a-template"),
      { params: Promise.resolve({ id: "not-a-template" }) },
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "COMFY_TEMPLATE_NOT_FOUND" });
  });
});
