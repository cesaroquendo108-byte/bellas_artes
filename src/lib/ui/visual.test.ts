import { describe, expect, it } from "vitest";

import { surfaceStateLabels, uiStatusToneClasses } from "./visual";

describe("visual UI contracts", () => {
  it("covers every public surface state", () => {
    expect(Object.keys(surfaceStateLabels).sort()).toEqual([
      "disabled",
      "empty",
      "error",
      "idle",
      "loading",
      "preparing",
      "ready",
    ]);
  });

  it("keeps a class contract for every status tone", () => {
    expect(Object.keys(uiStatusToneClasses).sort()).toEqual([
      "danger",
      "info",
      "neutral",
      "success",
      "warning",
    ]);
    expect(Object.values(uiStatusToneClasses).every((value) => value.includes("border"))).toBe(true);
  });
});

