import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("API POST /api/freefield/apps/[id]/execute", () => {
  it("ejecuta en modo dry-run y devuelve el resultado exitoso", async () => {
    const request = new Request("http://localhost/api/freefield/apps/recast/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dryRun: true,
        inputs: {
          prompt: "A cinematic replacement",
          clip: "clip.mp4",
          character: "char.png",
        },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "recast" }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.appId).toBe("recast");
    expect(data.status).toBe("dry_run");
  });

  it("devuelve 404 si la aplicación no existe", async () => {
    const request = new Request("http://localhost/api/freefield/apps/missing/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "missing_app" }) });
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe("FREEFIELD_APP_NOT_FOUND");
  });
});
