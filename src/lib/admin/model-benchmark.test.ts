import { describe, expect, it } from "vitest";

import {
  ADMIN_MODEL_BENCHMARK,
  calculateModelBenchmarkScore,
  listModelBenchmark,
  summarizeModelBenchmark,
} from "./model-benchmark";

describe("admin model benchmark", () => {
  it("keeps every candidate operator-only and uniquely identified", () => {
    expect(new Set(ADMIN_MODEL_BENCHMARK.map((model) => model.id)).size).toBe(
      ADMIN_MODEL_BENCHMARK.length,
    );
    expect(ADMIN_MODEL_BENCHMARK.every((model) => model.adminOnly)).toBe(true);
  });

  it("calculates a bounded, reproducible score", () => {
    for (const model of ADMIN_MODEL_BENCHMARK) {
      expect(calculateModelBenchmarkScore(model)).toBeGreaterThanOrEqual(0);
      expect(calculateModelBenchmarkScore(model)).toBeLessThanOrEqual(100);
    }
    expect(listModelBenchmark()[0]?.id).toBe("flux-schnell");
  });

  it("does not claim unexecuted models passed a smoke", () => {
    const passed = ADMIN_MODEL_BENCHMARK.filter(
      (model) => model.evidence === "smoke_passed",
    ).map((model) => model.id);
    expect(passed).toEqual(["flux-schnell", "sd35-medium"]);
    expect(summarizeModelBenchmark()).toMatchObject({
      total: 22,
      smokePassed: 2,
    });
  });

  it("replaces OpenPose and InsightFace instead of recommending purchase", () => {
    for (const id of ["cmu-openpose", "insightface-models"]) {
      expect(ADMIN_MODEL_BENCHMARK.find((model) => model.id === id)).toMatchObject({
        decision: "replace",
      });
    }
  });
});

