import { describe, expect, it } from "vitest";
import { getConfiguredQueueKinds, resolveProviderTimingMetrics } from "./generation-worker";

describe("generation worker queues", () => {
  it("normaliza, deduplica y limita las modalidades conocidas", () => {
    expect(getConfiguredQueueKinds(" image,audio,image,unknown ")).toEqual(["image", "audio"]);
  });

  it("permite aislar el worker a la cola de imagen", () => {
    expect(getConfiguredQueueKinds("image")).toEqual(["image"]);
  });
});

describe("generation worker provider timings", () => {
  it("prefiere tiempos reales del proveedor y convierte segundos", () => {
    expect(resolveProviderTimingMetrics({
      cold_start_seconds: 1.25,
      inference_ms: 275,
      total_seconds: 2,
    }, { startupMs: 5_000, inferenceMs: 6_000, totalMs: 7_000 })).toEqual({
      startupMs: 1_250,
      inferenceMs: 275,
      totalMs: 2_000,
    });
  });

  it("usa la medición del worker si el proveedor no informa una duración válida", () => {
    const fallback = { startupMs: 100, inferenceMs: 200, totalMs: 300 };
    expect(resolveProviderTimingMetrics({ inference_ms: Number.NaN }, fallback)).toEqual(fallback);
  });
});
