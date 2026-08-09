import { describe, expect, it } from "vitest";
import { classifyPayment } from "./status";

describe("classifyPayment", () => {
  const valid = {
    extractionSucceeded: true,
    expectedAmount: 2_400,
    extractedAmount: 2_400,
    reference: "12345678",
    duplicate: false,
  };

  it("deja una coincidencia pendiente de confirmación administrativa", () => {
    expect(classifyPayment(valid)).toBe("pending");
  });

  it("envía un monto distinto a revisión por discrepancia", () => {
    expect(classifyPayment({ ...valid, extractedAmount: 2_350 })).toBe(
      "amount_mismatch",
    );
  });

  it("envía referencias duplicadas a revisión manual", () => {
    expect(classifyPayment({ ...valid, duplicate: true })).toBe("manual_review");
  });

  it("no aprueba datos incompletos ni fallos de extracción", () => {
    expect(
      classifyPayment({ ...valid, extractionSucceeded: false }),
    ).toBe("manual_review");
    expect(classifyPayment({ ...valid, reference: null })).toBe("manual_review");
    expect(classifyPayment({ ...valid, extractedAmount: null })).toBe(
      "manual_review",
    );
  });

  it("respeta la tolerancia de un bolívar", () => {
    expect(classifyPayment({ ...valid, extractedAmount: 2_400.99 })).toBe(
      "pending",
    );
    expect(classifyPayment({ ...valid, extractedAmount: 2_401.01 })).toBe(
      "amount_mismatch",
    );
  });
});
