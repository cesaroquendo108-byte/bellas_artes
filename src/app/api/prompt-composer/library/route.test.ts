import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/prompt-composer/library", () => {
  it("returns all library entries and presets", async () => {
    const req = new Request("http://localhost:3000/api/prompt-composer/library");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThan(0);
    expect(data.entries.length).toBe(data.count);
    expect(data.presets.length).toBeGreaterThan(0);
  });

  it("filters library entries by category", async () => {
    const req = new Request("http://localhost:3000/api/prompt-composer/library?category=lighting");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.entries.every((e: { category: string }) => e.category === "lighting")).toBe(true);
  });

  it("searches library entries by keyword", async () => {
    const req = new Request("http://localhost:3000/api/prompt-composer/library?search=anamorphic");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.entries.some((e: { text: string }) => e.text.includes("Anamorphic"))).toBe(true);
  });
});
