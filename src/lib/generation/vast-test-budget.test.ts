import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateVastBudgetCeiling, finalizeVastTestBudget } from "./vast-test-budget";

describe("Vast test budget", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("mide el gasto real por diferencia de saldo", async () => {
    vi.stubEnv("VAST_API_KEY", "test-key");
    vi.stubEnv("VAST_TEST_BUDGET_USD", "0.50");
    vi.stubEnv("VAST_TEST_MAX_JOBS", "5");
    vi.stubEnv("VAST_TEST_MODALITY", "image");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ credit: 3.87 }), { status: 200 }));

    await expect(finalizeVastTestBudget({
      beforeBalanceUsd: 3.91,
      baselineBalanceUsd: 3.91,
      runId: "test",
    })).resolves.toMatchObject({
      afterBalanceUsd: 3.87,
      jobCostUsd: 0.04,
      totalSpentUsd: 0.04,
      overBudget: false,
    });
  });

  it("reduce el techo operativo para conservar la reserva con el saldo real", () => {
    expect(calculateVastBudgetCeiling(3.279524, 3.20, 0.40)).toBe(2.879524);
    expect(calculateVastBudgetCeiling(0.35, 3.20, 0.40)).toBe(0);
  });
});
