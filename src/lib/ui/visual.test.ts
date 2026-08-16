import { describe, expect, it } from "vitest";

import { generationStatusLabels, surfaceStateLabels, uiStatusToneClasses, visualDirectionPalettes, workspacePalette } from "./visual";

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

  it("defines honest generation states and controlled visual directions", () => {
    expect(Object.keys(generationStatusLabels).sort()).toEqual([
      "canceled",
      "completed",
      "failed",
      "not_configured",
      "processing",
      "queued",
    ]);
    expect(Object.keys(visualDirectionPalettes).sort()).toEqual([
      "caribe-electrico",
      "cine-violeta",
      "nocturno",
      "tierra-de-estudio",
    ]);
    expect(Object.values(visualDirectionPalettes).every((palette) => palette.contrast.startsWith("#"))).toBe(true);
  });
});
