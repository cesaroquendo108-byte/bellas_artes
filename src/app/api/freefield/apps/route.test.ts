import { describe, expect, it } from "vitest";
import { GET as getApps } from "./route";
import { GET as getAppById, POST as buildAppById } from "./[id]/route";

describe("Freefield API Endpoints en Bellas Artes", () => {
  it("GET /api/freefield/apps devuelve el catálogo completo", async () => {
    const request = new Request("http://localhost/api/freefield/apps");
    const response = await getApps(request);
    expect(response.status).toBe(200);

    const json = (await response.json()) as { total: number; apps: Array<{ id: string }> };
    expect(json.total).toBeGreaterThanOrEqual(120);
    expect(json.apps.some((a) => a.id === "recast")).toBe(true);
  });

  it("GET /api/freefield/apps?section=video filtra por sección", async () => {
    const request = new Request("http://localhost/api/freefield/apps?section=video");
    const response = await getApps(request);
    expect(response.status).toBe(200);

    const json = (await response.json()) as { total: number; apps: Array<{ section: string }> };
    expect(json.total).toBeGreaterThan(0);
    expect(json.apps.every((a) => a.section === "video")).toBe(true);
  });

  it("GET /api/freefield/apps/[id] devuelve los metadatos de una aplicación", async () => {
    const request = new Request("http://localhost/api/freefield/apps/recast");
    const response = await getAppById(request, { params: Promise.resolve({ id: "recast" }) });
    expect(response.status).toBe(200);

    const json = (await response.json()) as { app: { id: string; name: string }; hasGraph: boolean };
    expect(json.app.id).toBe("recast");
    expect(json.hasGraph).toBe(true);
  });

  it("GET /api/freefield/apps/[id] responde 404 para app inexistente", async () => {
    const request = new Request("http://localhost/api/freefield/apps/no-existe");
    const response = await getAppById(request, { params: Promise.resolve({ id: "no-existe" }) });
    expect(response.status).toBe(404);
  });

  it("POST /api/freefield/apps/[id] valida y construye el grafo de ComfyUI", async () => {
    const request = new Request("http://localhost/api/freefield/apps/recast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clip: "https://r2.bellasartes.com/clip.mp4",
        character: "https://r2.bellasartes.com/actor.png",
        prompt: "Caminando bajo la lluvia",
        target: "persona",
      }),
    });

    const response = await buildAppById(request, { params: Promise.resolve({ id: "recast" }) });
    expect(response.status).toBe(200);

    const json = (await response.json()) as { success: boolean; prompt: Record<string, unknown> };
    expect(json.success).toBe(true);
    expect(json.prompt).toBeDefined();
  });
});
