import { createHmac, timingSafeEqual } from "node:crypto";

export interface ProvenanceEnvelope {
  version: "ba-provenance-v1";
  algorithm: "hmac-sha256";
  signature: string;
}

type ProvenanceInput = {
  userId: string;
  jobId: string;
  sha256: string;
  contentType: string;
};

function statement(input: ProvenanceInput) {
  return ["ba-provenance-v1", input.userId, input.jobId, input.sha256, input.contentType].join("\n");
}

export function createProvenanceEnvelope(input: ProvenanceInput): ProvenanceEnvelope | null {
  const key = process.env.PROVENANCE_SIGNING_KEY?.trim();
  if (!key) {
    if (process.env.GENERATION_REQUIRE_PROVENANCE === "true") throw new Error("PROVENANCE_SIGNING_KEY_NOT_CONFIGURED");
    return null;
  }
  return {
    version: "ba-provenance-v1",
    algorithm: "hmac-sha256",
    signature: createHmac("sha256", key).update(statement(input)).digest("hex"),
  };
}

export function verifyProvenanceEnvelope(input: ProvenanceInput, envelope: ProvenanceEnvelope) {
  const expected = createProvenanceEnvelope(input);
  if (!expected || expected.version !== envelope.version || expected.algorithm !== envelope.algorithm) return false;
  const actualBytes = Buffer.from(envelope.signature, "hex");
  const expectedBytes = Buffer.from(expected.signature, "hex");
  return actualBytes.byteLength === expectedBytes.byteLength && timingSafeEqual(actualBytes, expectedBytes);
}
