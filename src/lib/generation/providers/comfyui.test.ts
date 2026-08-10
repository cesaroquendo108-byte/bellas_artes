import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComfyUIProvider } from "./comfyui";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ComfyUIProvider", () => {
  beforeEach(() => {
    vi.stubEnv("VAST_IMAGE_COMFY_BASE_URL", "https://image.example.test");
    vi.stubEnv("VAST_REQUEST_TIMEOUT_MS", "1000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reanuda un prompt existente para no duplicar el job", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({
      queue_running: [[1, "provider-job-1", {}, { client_id: "job-1" }]],
      queue_pending: [],
    }));

    const result = await new ComfyUIProvider("image").submit({
      jobId: "job-1",
      kind: "image",
      workflowVersion: "image/flux-schnell-v1",
      backendModel: "flux-schnell",
      request: { prompt: "prueba" },
    });

    expect(result.providerJobId).toBe("provider-job-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://image.example.test/queue");
  });

  it("envía un prompt nuevo sólo después de comprobar cola e historial", async () => {
    vi.stubEnv("WORKFLOW_IMAGE_FLUX_SCHNELL_V1", JSON.stringify({
      "1": { inputs: { text: "original" }, class_type: "CLIPTextEncode" },
    }));
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ queue_running: [], queue_pending: [] }))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({ prompt_id: "provider-job-2" }));

    const result = await new ComfyUIProvider("image").submit({
      jobId: "job-2",
      kind: "image",
      workflowVersion: "image/flux-schnell-v1",
      backendModel: "flux-schnell",
      request: { prompt: "nuevo" },
    });

    expect(result.providerJobId).toBe("provider-job-2");
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      "https://image.example.test/queue",
      "https://image.example.test/history?max_items=100",
      "https://image.example.test/prompt",
    ]);
  });

  it("trata HTTP 429 como transitorio", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({}, 429));

    await expect(new ComfyUIProvider("image").getStatus({
      providerJobId: "provider-job-3",
      provider: "vast",
      kind: "image",
    })).rejects.toMatchObject({
      code: "COMFY_HTTP_429",
      retryable: true,
    });
  });

  it("falla cerrado si no puede comprobar idempotencia", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("network down"));

    await expect(new ComfyUIProvider("image").submit({
      jobId: "job-4",
      kind: "image",
      workflowVersion: "image/flux-schnell-v1",
      backendModel: "flux-schnell",
      request: { prompt: "prueba" },
    })).rejects.toMatchObject({
      code: "COMFY_IDEMPOTENCY_CHECK",
      retryable: true,
    });
  });

  it("usa el protocolo oficial de Vast Serverless sin URL GPU persistente", async () => {
    vi.stubEnv("VAST_IMAGE_SERVERLESS_ENDPOINT", "ba-image-sandbox");
    vi.stubEnv("VAST_API_KEY", "test-vast-key");
    vi.stubEnv("CLOUDFLARE_R2_ACCOUNT_ID", "account-test");
    vi.stubEnv("WORKFLOW_IMAGE_FLUX_SCHNELL_V1", JSON.stringify({
      "1": { inputs: { text: "original" }, class_type: "CLIPTextEncode" },
    }));
    const onAssigned = vi.fn(async () => undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({
        endpoint: "ba-image-sandbox",
        url: "https://worker.example.test",
        cost: 100,
        reqnum: 42,
        signature: "signed-route",
      }))
      .mockResolvedValueOnce(jsonResponse({
        response: {
          status: "completed",
          output: [{
            filename: "result.png",
            url: "https://account-test.r2.cloudflarestorage.com/result.png?signature=test",
          }],
          timings: { inference_ms: 250 },
        },
      }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/png" },
      }));

    const execution = await new ComfyUIProvider("image").execute({
      jobId: "job-serverless-1",
      kind: "image",
      workflowVersion: "image/flux-schnell-v1",
      backendModel: "flux-schnell",
      request: { prompt: "nuevo" },
    }, { onAssigned });

    expect(execution.result.contentType).toBe("image/png");
    expect(execution.result.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(execution.timings).toEqual({ inference_ms: 250 });
    expect(onAssigned).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://run.vast.ai/route/");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://worker.example.test/generate/sync");
    const workerInit = fetchMock.mock.calls[1]?.[1];
    expect(workerInit?.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(String(workerInit?.body))).toMatchObject({
      auth_data: { signature: "signed-route", reqnum: 42 },
      payload: { input: { request_id: "job-serverless-1" } },
    });
  });
});
