import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));

import {
  CURRENT_MODERATION_VERSION,
  CURRENT_TERMS_VERSION,
  assertLegalConsent,
  getLegalConsentStatus,
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
});
