import { describe, expect, it } from "vitest";

import {
  QUEUE_GATEWAY_MAX_CLOCK_SKEW_MS,
  signQueueGatewayRequest,
  verifyQueueGatewayRequest,
} from "./signature";

const secret = "a-secret-with-at-least-thirty-two-characters";
const request = {
  method: "POST",
  pathname: "/v1/generation/enqueue",
  timestamp: "1760000000000",
  nonce: "11111111-1111-4111-8111-111111111111",
  body: JSON.stringify({ kind: "image", jobId: "22222222-2222-4222-8222-222222222222" }),
};

describe("firma del gateway Redis", () => {
  it("acepta una firma válida dentro de la ventana de tiempo", () => {
    const signature = signQueueGatewayRequest(request, secret);
    expect(verifyQueueGatewayRequest({ ...request, signature, now: Number(request.timestamp) }, secret)).toBe(true);
  });

  it("rechaza cambios en el cuerpo y solicitudes vencidas", () => {
    const signature = signQueueGatewayRequest(request, secret);
    expect(verifyQueueGatewayRequest({ ...request, body: "{}", signature, now: Number(request.timestamp) }, secret)).toBe(false);
    expect(verifyQueueGatewayRequest({
      ...request,
      signature,
      now: Number(request.timestamp) + QUEUE_GATEWAY_MAX_CLOCK_SKEW_MS + 1,
    }, secret)).toBe(false);
  });
});
