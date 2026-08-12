import { describe, expect, it } from "vitest";

import { surfaceStateLabels, uiStatusToneClasses, workspacePalette } from "./visual";

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

  it("keeps the authenticated workspace palette independent from the dark landing", () => {
    expect(workspacePalette.canvas).toBe("#F7F4EC");
    expect(workspacePalette.primary).toBe("#7C3AED");
    expect(workspacePalette.surface).not.toBe("#0A0A0A");
  });
});
