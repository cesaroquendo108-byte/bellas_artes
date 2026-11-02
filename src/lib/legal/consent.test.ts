import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));

import {
  CURRENT_MODERATION_VERSION,
  CURRENT_TERMS_VERSION,
  assertLegalConsent,
  getLegalConsentStatus,
  recordLegalConsent,
} from "./consent";

function query(data: unknown, error: unknown = null) {
  const result = Promise.resolve({ data, error });
  return {
    select: () => ({
      eq: () => ({
        in: () => result,
      }),
    }),
  };
}

describe("legal consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getLegalConsentStatus & assertLegalConsent", () => {
    it("requires both current, versioned consents", async () => {
      mocks.from.mockReturnValue(query([
        { consent_type: "terms", version: CURRENT_TERMS_VERSION },
      ]));

      await expect(getLegalConsentStatus("user-id")).resolves.toEqual({
        terms: true,
        moderation: false,
        complete: false,
      });
      await expect(assertLegalConsent("user-id")).rejects.toMatchObject({
        code: "LEGAL_CONSENT_REQUIRED",
        status: 403,
      });
    });

    it("accepts only the current pair", async () => {
      mocks.from.mockReturnValue(query([
        { consent_type: "terms", version: CURRENT_TERMS_VERSION },
        { consent_type: "moderation", version: CURRENT_MODERATION_VERSION },
        { consent_type: "terms", version: "old-version" },
      ]));

      await expect(assertLegalConsent("user-id")).resolves.toMatchObject({ complete: true });
    });

    it("returns false for both when user has no consent records", async () => {
      mocks.from.mockReturnValue(query([]));

      await expect(getLegalConsentStatus("user-id")).resolves.toEqual({
        terms: false,
        moderation: false,
        complete: false,
      });
    });

    it("throws 503 LEGAL_CONSENT_UNAVAILABLE if database query fails", async () => {
      mocks.from.mockReturnValue(query(null, { message: "database offline" }));

      await expect(getLegalConsentStatus("user-id")).rejects.toMatchObject({
        code: "LEGAL_CONSENT_UNAVAILABLE",
        status: 503,
      });
    });
  });

  describe("recordLegalConsent", () => {
    it("records both terms and moderation with hashed IP and metadata", async () => {
      vi.stubEnv("MODERATION_AUDIT_SALT", "secret-salt");
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      mocks.from.mockReturnValue({ upsert: upsertMock });

      const longUserAgent = "A".repeat(600);
      await recordLegalConsent({
        userId: "user-123",
        ipAddress: "203.0.113.195",
        userAgent: longUserAgent,
        source: "consent-page",
      });

      expect(mocks.from).toHaveBeenCalledWith("user_consents");
      expect(upsertMock).toHaveBeenCalledTimes(1);

      const [rows, options] = upsertMock.mock.calls[0];
      expect(options).toEqual({
        onConflict: "user_id,consent_type,version",
        ignoreDuplicates: true,
      });
      expect(rows).toHaveLength(2);

      const expectedIpHash = createHash("sha256")
        .update("secret-salt:203.0.113.195")
        .digest("hex");
      expect(expectedIpHash).toHaveLength(64);

      const termsRow = rows.find((r: { consent_type: string }) => r.consent_type === "terms");
      expect(termsRow).toBeDefined();
      expect(termsRow.user_id).toBe("user-123");
      expect(termsRow.version).toBe(CURRENT_TERMS_VERSION);
      expect(termsRow.ip_hash).toBe(expectedIpHash);
      expect(termsRow.user_agent).toBe("A".repeat(512));
      expect(termsRow.metadata).toEqual({ source: "consent-page" });

      const moderationRow = rows.find((r: { consent_type: string }) => r.consent_type === "moderation");
      expect(moderationRow).toBeDefined();
      expect(moderationRow.user_id).toBe("user-123");
      expect(moderationRow.version).toBe(CURRENT_MODERATION_VERSION);
      expect(moderationRow.ip_hash).toBe(expectedIpHash);
      expect(moderationRow.user_agent).toBe("A".repeat(512));
      expect(moderationRow.metadata).toEqual({ source: "consent-page" });
    });

    it("stores null for ip_hash when salt is not configured", async () => {
      vi.stubEnv("MODERATION_AUDIT_SALT", "");
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      mocks.from.mockReturnValue({ upsert: upsertMock });

      await recordLegalConsent({
        userId: "user-456",
        ipAddress: "198.51.100.2",
      });

      const [rows] = upsertMock.mock.calls[0];
      expect(rows[0].ip_hash).toBeNull();
      expect(rows[1].ip_hash).toBeNull();
      expect(rows[0].user_agent).toBeNull();
      expect(rows[0].metadata).toEqual({ source: "legal-consent" });
    });

    it("stores null for ip_hash when ipAddress is undefined", async () => {
      vi.stubEnv("MODERATION_AUDIT_SALT", "my-salt");
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      mocks.from.mockReturnValue({ upsert: upsertMock });

      await recordLegalConsent({
        userId: "user-789",
      });

      const [rows] = upsertMock.mock.calls[0];
      expect(rows[0].ip_hash).toBeNull();
      expect(rows[1].ip_hash).toBeNull();
    });

    it("throws 503 LEGAL_CONSENT_UNAVAILABLE when upsert fails", async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: { message: "connection timeout" } });
      mocks.from.mockReturnValue({ upsert: upsertMock });

      await expect(
        recordLegalConsent({ userId: "user-err" }),
      ).rejects.toMatchObject({
        code: "LEGAL_CONSENT_UNAVAILABLE",
        status: 503,
      });
    });
  });
});
