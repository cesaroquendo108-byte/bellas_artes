import { afterEach, describe, expect, it, vi } from "vitest";

import { getImageModelCatalogEntry, listImageModelCatalog } from "./model-catalog";

describe("image model catalog", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("declares PixArt-Sigma and SD3.5 without presenting them as real workflows", () => {
    vi.stubEnv("GENERATION_ENABLED", "true");
    const catalog = listImageModelCatalog();
    expect(catalog.map((entry) => entry.id)).toEqual([
      "image-flux-schnell",
      "image-flux-dev",
      "image-pixart-sigma-v1",
      "image-sd35-medium-v1",
    ]);
    expect(getImageModelCatalogEntry("image-pixart-sigma-v1")).toMatchObject({
      status: "preparing",
      realWorkflowConfigured: false,
      license: "Apache 2.0",
      entitlementRequired: "admin",
    });
    expect(getImageModelCatalogEntry("image-sd35-medium-v1")).toMatchObject({
      status: "preparing",
      realWorkflowConfigured: false,
      license: "Stability AI Community License",
    });
  });

  it("separates a real workflow from the public availability gate", () => {
    vi.stubEnv("GENERATION_ENABLED", "false");
    expect(getImageModelCatalogEntry("image-flux-schnell")).toMatchObject({
      realWorkflowConfigured: true,
      status: "disabled",
    });
  });
});
