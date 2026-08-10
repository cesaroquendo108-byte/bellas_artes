import { describe, expect, it } from "vitest";
import { getGenerationPollDelay } from "./use-generation-job";

describe("generation polling", () => {
  it("polls faster while the tab is visible", () => {
    expect(getGenerationPollDelay("processing", false)).toBe(2500);
    expect(getGenerationPollDelay("queued", true)).toBe(10000);
  });

  it("stops polling terminal states", () => {
    expect(getGenerationPollDelay("completed", false)).toBeNull();
    expect(getGenerationPollDelay("failed", false)).toBeNull();
    expect(getGenerationPollDelay("canceled", true)).toBeNull();
  });
});
