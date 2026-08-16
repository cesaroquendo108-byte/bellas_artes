import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { postQueueGateway } from "./client";
import { queueGatewayHeaders, verifyQueueGatewayRequest } from "./signature";

const secret = "a-secret-with-at-least-thirty-two-characters";

describe("cliente del gateway Redis", () => {
  beforeEach(() => {
    vi.stubEnv("QUEUE_GATEWAY_URL", "https://queue.example.test");
    vi.stubEnv("QUEUE_GATEWAY_HMAC_KEY", secret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("firma el cuerpo exacto de la solicitud", async () => {
    const fetchMock = vi.fn(async (_url: URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const body = String(init?.body);
      expect(verifyQueueGatewayRequest({
        method: "POST",
        pathname: "/v1/test",
        timestamp: headers.get(queueGatewayHeaders.timestamp) ?? "",
        nonce: headers.get(queueGatewayHeaders.nonce) ?? "",
        signature: headers.get(queueGatewayHeaders.signature) ?? "",
        body,
      }, secret)).toBe(true);
      return Response.json({ ok: true, data: { accepted: true } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(postQueueGateway("/v1/test", { value: 1 })).resolves.toEqual({ accepted: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("conserva el estado y código de un error del gateway", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { ok: false, error: { code: "GENERATION_RATE_LIMITED", message: "Límite alcanzado." } },
      { status: 429 },
    )));

    await expect(postQueueGateway("/v1/test", {})).rejects.toMatchObject({
      status: 429,
      code: "GENERATION_RATE_LIMITED",
    });
  });
});
