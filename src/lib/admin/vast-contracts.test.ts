import { describe, expect, it } from "vitest";

import {
  calculateBidPrice,
  calculateProjectedCost,
  classifyLifecycleHeartbeat,
  validateOfferForRental,
  type VastAdminLimits,
} from "./vast-contracts";

const limits: VastAdminLimits = {
  maxActiveInstances: 1,
  maxHourlyUsd: 0.6,
  maxRentalUsd: 1.2,
  minBalanceReserveUsd: 0.4,
  minReliability: 0.98,
  minGpuRamMb: 24_000,
};

describe("contratos administrativos Vast", () => {
  it("calcula bid con 10% y coste máximo por TTL", () => {
    expect(calculateBidPrice(0.2)).toBe(0.22);
    expect(calculateProjectedCost(0.6, 15)).toBe(0.15);
    expect(calculateProjectedCost(0.6, 120)).toBe(1.2);
  });

  it("clasifica heartbeats sin permitir alquiler con un worker viejo", () => {
    const now = Date.parse("2026-08-13T12:00:00.000Z");
    expect(classifyLifecycleHeartbeat({ observedAt: "2026-08-13T11:59:00.000Z", reportedStatus: "healthy", now })).toBe("healthy");
    expect(classifyLifecycleHeartbeat({ observedAt: "2026-08-13T11:57:30.000Z", reportedStatus: "healthy", now })).toBe("degraded");
    expect(classifyLifecycleHeartbeat({ observedAt: "2026-08-13T11:55:00.000Z", reportedStatus: "healthy", now })).toBe("stale");
    expect(classifyLifecycleHeartbeat({ observedAt: null, reportedStatus: null, now })).toBe("not_configured");
  });

  it("rechaza ofertas que exceden GPU, VRAM, confiabilidad, precio o máquina del volumen", () => {
    const offer = { numGpus: 1, gpuRamMb: 24_576, reliability: 0.995, hourlyUsd: 0.3, machineId: 42 };
    expect(validateOfferForRental({ offer, preset: "comfy-clean", limits, fluxMachineId: 99 })).toBeNull();
    expect(validateOfferForRental({ offer: { ...offer, numGpus: 2 }, preset: "comfy-clean", limits, fluxMachineId: null })).toBe("VAST_OFFER_GPU_COUNT");
    expect(validateOfferForRental({ offer: { ...offer, hourlyUsd: 0.61 }, preset: "comfy-clean", limits, fluxMachineId: null })).toBe("VAST_OFFER_PRICE");
    expect(validateOfferForRental({ offer, preset: "flux-cached", limits, fluxMachineId: 99 })).toBe("VAST_OFFER_VOLUME_MACHINE");
  });
});
