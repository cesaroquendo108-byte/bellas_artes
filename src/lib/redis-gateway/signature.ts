import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const queueGatewayHeaders = {
  timestamp: "x-bellas-artes-timestamp",
  nonce: "x-bellas-artes-nonce",
  signature: "x-bellas-artes-signature",
} as const;

export const QUEUE_GATEWAY_MAX_CLOCK_SKEW_MS = 60_000;

type SignatureInput = {
  method: string;
  pathname: string;
  timestamp: string;
  nonce: string;
  body: string;
};

function canonicalRequest(input: SignatureInput) {
  const bodyHash = createHash("sha256").update(input.body).digest("hex");
  return [input.method.toUpperCase(), input.pathname, input.timestamp, input.nonce, bodyHash].join("\n");
}

export function signQueueGatewayRequest(input: SignatureInput, secret: string) {
  return createHmac("sha256", secret).update(canonicalRequest(input)).digest("hex");
}

export function verifyQueueGatewayRequest(
  input: SignatureInput & { signature: string; now?: number },
  secret: string,
) {
  const timestamp = Number(input.timestamp);
  if (!Number.isSafeInteger(timestamp)) return false;
  if (Math.abs((input.now ?? Date.now()) - timestamp) > QUEUE_GATEWAY_MAX_CLOCK_SKEW_MS) return false;
  if (!/^[0-9a-f]{64}$/i.test(input.signature)) return false;

  const expected = Buffer.from(signQueueGatewayRequest(input, secret), "hex");
  const actual = Buffer.from(input.signature, "hex");
  return expected.byteLength === actual.byteLength && timingSafeEqual(expected, actual);
}
