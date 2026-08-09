import { describe, expect, it } from "vitest";
import { assetExpiryForPlan } from "./retention";

describe("assetExpiryForPlan", () => {
  const now = new Date("2026-08-08T12:00:00.000Z");

  it("retiene los assets gratuitos durante 15 días", () => {
    expect(assetExpiryForPlan("free", now)).toBe("2026-08-23T12:00:00.000Z");
  });

  it.each(["pro", "b2b"])("conserva permanentemente el plan %s", (plan) => {
    expect(assetExpiryForPlan(plan, now)).toBeNull();
  });
});
