import { describe, expect, it } from "vitest";

import { parseManualPaymentCorrection } from "./manual-review";

describe("parseManualPaymentCorrection", () => {
  it("permite no enviar corrección manual", () => {
    expect(parseManualPaymentCorrection("", "")).toEqual({});
  });

  it("valida y normaliza una corrección", () => {
    expect(parseManualPaymentCorrection(" 2400.50 ", " 12345678 ")).toEqual({
      correction: { amountBs: 2400.5, reference: "12345678" },
    });
  });

  it("exige monto y referencia juntos", () => {
    expect(parseManualPaymentCorrection("2400", "").error).toContain("monto y referencia");
  });

  it("rechaza valores inválidos", () => {
    expect(parseManualPaymentCorrection("0", "1234").error).toContain("monto");
    expect(parseManualPaymentCorrection("2400", "123").error).toContain("referencia");
  });
});
