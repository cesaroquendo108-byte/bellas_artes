import { afterEach, describe, expect, it } from "vitest";
import { createProvenanceEnvelope, verifyProvenanceEnvelope } from "./provenance";

const input = { userId: "user", jobId: "job", sha256: "a".repeat(64), contentType: "image/png" };

afterEach(() => {
  delete process.env.PROVENANCE_SIGNING_KEY;
  delete process.env.GENERATION_REQUIRE_PROVENANCE;
});

describe("generation provenance", () => {
  it("firma y verifica la procedencia sin exponer la clave", () => {
    process.env.PROVENANCE_SIGNING_KEY = "test-signing-key";
    const envelope = createProvenanceEnvelope(input);
    expect(envelope?.signature).toHaveLength(64);
    expect(envelope && verifyProvenanceEnvelope(input, envelope)).toBe(true);
    expect(envelope && verifyProvenanceEnvelope({ ...input, jobId: "other" }, envelope)).toBe(false);
  });

  it("falla cerrado cuando la firma es obligatoria", () => {
    process.env.GENERATION_REQUIRE_PROVENANCE = "true";
    expect(() => createProvenanceEnvelope(input)).toThrow("PROVENANCE_SIGNING_KEY_NOT_CONFIGURED");
  });
});
