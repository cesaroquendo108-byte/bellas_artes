import type { PaymentStatus } from "@/lib/types";

export function classifyPayment(input: {
  extractionSucceeded: boolean;
  expectedAmount: number;
  extractedAmount: number | null;
  reference: string | null;
  duplicate: boolean;
  tolerance?: number;
}): PaymentStatus {
  if (!input.extractionSucceeded || !input.reference || input.duplicate) {
    return "manual_review";
  }
  if (input.extractedAmount === null) return "manual_review";
  const tolerance = input.tolerance ?? 1;
  if (Math.abs(input.expectedAmount - input.extractedAmount) > tolerance) {
    return "amount_mismatch";
  }
  return "pending";
}
