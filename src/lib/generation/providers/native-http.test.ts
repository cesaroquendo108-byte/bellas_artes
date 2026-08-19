import { afterEach, describe, expect, it, vi } from "vitest";

import { NativeHttpProvider } from "./native-http";

describe("native HTTP provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function configure() {
    vi.stubEnv("NATIVE_IMAGE_RUNTIME_BASE_URL", "https://runtime.example/api/");
    vi.stubEnv("NATIVE_RUNTIME_API_KEY", "private-native-key");
  }

  it("comprueba salud y exige que el modelo esté cargado", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "healthy",
      models: [{ id: "pixart-sigma" }],
    }), { status: 200 })));

    await expect(new NativeHttpProvider("image", "pixart-sigma").health()).resolves.toBe(true);
    await expect(new NativeHttpProvider("image", "qwen-image").health()).resolves.toBe(false);
  });

  it("envía un sobre idempotente sin exponer la clave en el cuerpo", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "native-123", status: "queued" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new NativeHttpProvider("image", "pixart-sigma").submit({
      jobId: "job-123",
      kind: "image",
      workflowVersion: "image/pixart-sigma-v1",
      backendModel: "pixart-sigma",
      request: { prompt: "Ávila al amanecer" },
      sourceUrls: ["https://signed.example/source"],
    })).resolves.toEqual({ providerJobId: "native-123", provider: "vast", kind: "image" });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://runtime.example/api/v1/jobs");
    expect(init.headers).toMatchObject({ authorization: "Bearer private-native-key", "x-idempotency-key": "job-123" });
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ request_id: "job-123", model: "pixart-sigma", operation: "image/pixart-sigma-v1" });
    expect(JSON.stringify(body)).not.toContain("private-native-key");
  });

  it("normaliza estados y descarga una salida base64", async () => {
    configure();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "succeeded" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "completed",
        output: {
          filename: "../resultado.png",
          content_type: "image/png",
          data: Buffer.from("png-data").toString("base64"),
          metadata: { model_revision: "abc123", ignored: 42 },
        },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new NativeHttpProvider("image", "pixart-sigma");
    const job = { providerJobId: "native-123", provider: "vast" as const, kind: "image" as const };

    await expect(provider.getStatus(job)).resolves.toBe("completed");
    await expect(provider.getResult(job)).resolves.toMatchObject({
      filename: "resultado.png",
      contentType: "image/png",
      metadata: { model_revision: "abc123" },
    });
  });

  it("rechaza runtime HTTP y hosts de salida no permitidos", async () => {
    vi.stubEnv("NATIVE_IMAGE_RUNTIME_BASE_URL", "http://runtime.example/");
    vi.stubEnv("NATIVE_RUNTIME_API_KEY", "private-native-key");
    const provider = new NativeHttpProvider("image", "pixart-sigma");
    await expect(provider.submit({
      jobId: "job-123",
      kind: "image",
      workflowVersion: "image/pixart-sigma-v1",
      backendModel: "pixart-sigma",
      request: {},
    })).rejects.toMatchObject({ code: "NATIVE_URL_REJECTED", retryable: false });

    vi.stubEnv("NATIVE_IMAGE_RUNTIME_BASE_URL", "https://runtime.example/");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "completed",
      output: { filename: "result.png", url: "https://evil.example/result.png" },
    }), { status: 200 })));
    await expect(provider.getResult({ providerJobId: "native-123", provider: "vast", kind: "image" }))
      .rejects.toMatchObject({ code: "NATIVE_OUTPUT_URL_REJECTED", retryable: false });
  });
});
