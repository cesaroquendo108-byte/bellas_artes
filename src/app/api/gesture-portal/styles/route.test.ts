import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/gesture-portal/styles", () => {
  it("returns all 9 gesture portal styles", async () => {
    const req = new Request("http://localhost:3000/api/gesture-portal/styles");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(9);
    expect(data.styles.length).toBe(9);
  });

  it("returns specific style details by id", async () => {
    const req = new Request("http://localhost:3000/api/gesture-portal/styles?id=anime");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.style.id).toBe("anime");
    expect(data.style.name).toContain("Anime");
  });

  it("returns 404 for invalid style id", async () => {
    const req = new Request("http://localhost:3000/api/gesture-portal/styles?id=invalid_style");
    const res = await GET(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("no existe");
  });
});
