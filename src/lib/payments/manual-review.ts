export type ManualPaymentCorrection = {
  amountBs: number;
  reference: string;
};

export function parseManualPaymentCorrection(
  amountRaw: string | undefined,
  referenceRaw: string | undefined,
): { correction?: ManualPaymentCorrection; error?: string } {
  const amountText = amountRaw?.trim() ?? "";
  const reference = referenceRaw?.trim() ?? "";
  if (!amountText && !reference) return {};
  if (!amountText || !reference) {
    return { error: "Para corregir un pago debes indicar monto y referencia." };
  }

  const amountBs = Number(amountText);
  if (!Number.isFinite(amountBs) || amountBs <= 0 || amountBs > 1_000_000_000) {
    return { error: "El monto manual no es válido." };
  }
  if (reference.length < 4 || reference.length > 80) {
    return { error: "La referencia debe tener entre 4 y 80 caracteres." };
  }

  return { correction: { amountBs, reference } };
}
