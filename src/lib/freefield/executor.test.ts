import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { executeFreefieldApp, resolveComfyUrl } from "./executor";

describe("Freefield Executor", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("resolveComfyUrl", () => {
    it("usa el override si se proporciona", () => {
      expect(resolveComfyUrl("http://override:9999/")).toBe("http://override:9999");
    });

    it("usa VAST_COMFY_BASE_URL si existe en el entorno", () => {
      process.env.VAST_COMFY_BASE_URL = "http://vast-instance:18188/";
      expect(resolveComfyUrl()).toBe("http://vast-instance:18188");
    });

    it("usa el fallback por defecto si no hay variable de entorno", () => {
      delete process.env.VAST_COMFY_BASE_URL;
      delete process.env.COMFYUI_URL;
      expect(resolveComfyUrl()).toBe("http://127.0.0.1:18188");
    });
  });

  describe("executeFreefieldApp (dryRun)", () => {
    it("compila el workflow en modo dry-run sin realizar llamadas de red", async () => {
      const result = await executeFreefieldApp(
        "recast",
        {
          prompt: "A cinematic character replacement",
          clip: "input_clip.mp4",
          character: "char.png",
        },
        { dryRun: true },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("dry_run");
      expect(result.appId).toBe("recast");
      expect(result.appName).toBe("Recast");
      expect(result.artifacts).toEqual([]);
    });

    it("lanza error si la aplicación no existe", async () => {
      await expect(
        executeFreefieldApp("app_inexistente_999", {}, { dryRun: true }),
      ).rejects.toThrow('La aplicación Freefield "app_inexistente_999" no existe.');
    });
  });

  describe("executeFreefieldApp (live execution mock)", () => {
    it("envía el prompt, sondea el historial y extrae los artefactos", async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.endsWith("/prompt") && init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ prompt_id: "test-prompt-uuid" }),
          });
        }
        if (url.endsWith("/history/test-prompt-uuid")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                "test-prompt-uuid": {
                  status: { completed: true },
                  outputs: {
                    "202": {
                      videos: [
                        {
                          filename: "recast_output_001.mp4",
                          subfolder: "freefield",
                          type: "output",
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      vi.stubGlobal("fetch", mockFetch);

      const result = await executeFreefieldApp(
        "recast",
        {
          prompt: "Heroic shot in tactical gear",
          clip: "test.mp4",
          character: "face.png",
        },
        {
          comfyUrl: "http://test-comfy:18188",
          pollIntervalMs: 10,
          timeoutSeconds: 2,
        },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
      expect(result.promptId).toBe("test-prompt-uuid");
      expect(result.artifacts.length).toBe(1);
      expect(result.artifacts[0].filename).toBe("recast_output_001.mp4");
      expect(result.artifacts[0].subfolder).toBe("freefield");
      expect(result.artifacts[0].url).toContain("recast_output_001.mp4");
    });

    it("maneja errores reportados por el motor de ComfyUI", async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.endsWith("/prompt") && init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ prompt_id: "error-prompt-uuid" }),
          });
        }
        if (url.endsWith("/history/error-prompt-uuid")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                "error-prompt-uuid": {
                  status: {
                    status_str: "error",
                    messages: ["OOM on layer 4"],
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      vi.stubGlobal("fetch", mockFetch);

      const result = await executeFreefieldApp(
        "recast",
        {
          clip: "test.mp4",
          character: "face.png",
        },
        {
          comfyUrl: "http://test-comfy:18188",
          pollIntervalMs: 10,
          timeoutSeconds: 2,
        },
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.error).toContain("OOM on layer 4");
    });
  });
});
