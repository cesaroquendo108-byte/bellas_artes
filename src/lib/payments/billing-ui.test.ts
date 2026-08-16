import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("customer billing language", () => {
  const billingPage = readFileSync(path.join(root, "src/app/(app)/billing/page.tsx"), "utf8");
  const paymentForm = readFileSync(path.join(root, "src/components/billing/payment-form.tsx"), "utf8");
  const settingsPage = readFileSync(path.join(root, "src/app/(app)/settings/page.tsx"), "utf8");
  const adminLayout = readFileSync(path.join(root, "src/app/(admin)/admin/layout.tsx"), "utf8");

  it("shows USD first and the daily bolivar equivalent second", () => {
    expect(billingPage).toContain("US${pkg.priceUsd}");
    expect(billingPage).toContain("formatBolivarAmount");
    expect(billingPage).toContain("se actualiza diariamente");
  });

  it("shows Pago Móvil details before asking for the receipt", () => {
    expect(paymentForm).toContain('"Pagar"');
    expect(paymentForm).toContain("04126319964");
    expect(paymentForm).toContain("30821164");
    expect(paymentForm).toContain(">BNC</dd>");
    expect(billingPage).toContain("paymentAmount");
  });

  it("does not expose internal pricing or review language to customers", () => {
    expect(billingPage).not.toContain("tasa BCV");
    expect(billingPage).not.toContain("Aprobación humana");
    expect(billingPage).not.toContain("Revisión manual");
  });

  it("removes the ambiguous retention row from account settings", () => {
    expect(settingsPage).not.toContain("[\"Retención\"");
  });

  it("keeps administration on the dark Bellas Artes backoffice theme", () => {
    expect(adminLayout).not.toContain("workspace-theme");
    expect(adminLayout).toContain('bg-[#080808]');
  });
});
