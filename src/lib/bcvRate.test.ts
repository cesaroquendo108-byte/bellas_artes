import { describe, expect, it } from "vitest";

import {
  calculateBolivarAmount,
  calculatePaymentRate,
  currentCaracasDate,
  formatBolivarAmount,
  parseFinveRateResponse,
} from "@/lib/bcvRate";

describe("Finve payment pricing", () => {
  it("applies the fixed 20 percent protection margin", () => {
    expect(calculatePaymentRate(766.8603)).toBe(920.23);
  });

  it("calculates and formats the customer-facing bolivar amount", () => {
    expect(calculateBolivarAmount(5, 920.23)).toBe(4_601.15);
    expect(formatBolivarAmount(4_601.15)).toBe("Bs 4.601,15");
  });

  it("parses the typed text returned by the Finve MCP tool", () => {
    expect(parseFinveRateResponse({
      result: {
        content: [{
          type: "text",
          text: JSON.stringify([{ date: "2026-08-13", currency: "USD", exchangeRate: 766.8603 }]),
        }],
      },
    })).toBe(766.8603);
  });

  it("rejects invalid or non-USD responses", () => {
    expect(() => parseFinveRateResponse({
      result: { content: [{ type: "text", text: JSON.stringify([{ currency: "EUR", exchangeRate: 900 }]) }] },
    })).toThrow("tasa inválida");
  });

  it("uses the Caracas calendar date", () => {
    expect(currentCaracasDate(new Date("2026-08-14T02:30:00.000Z"))).toBe("2026-08-13");
  });
});
