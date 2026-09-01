import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetBcvRate } = vi.hoisted(() => ({ mockGetBcvRate: vi.fn() }));

vi.mock("@/lib/bcvRate", () => ({ getBcvRate: mockGetBcvRate }));

import { GET } from "./route";

describe("GET /api/bcv-rate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve la tasa cuando Finve responde", async () => {
    mockGetBcvRate.mockResolvedValue(145.25);
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ rate: 145.25 });
  });

  it("devuelve un error operativo controlado si falla la integración", async () => {
    mockGetBcvRate.mockRejectedValue(new Error("Finve unavailable"));
    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      errorCode: "BCV_RATE_UNAVAILABLE",
      message: "La tasa de pago no está disponible temporalmente.",
    });
  });
});
