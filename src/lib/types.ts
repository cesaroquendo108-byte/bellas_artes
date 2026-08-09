export type CreditPackageId = "curioso" | "creador" | "estudio";

export type PaymentStatus =
  | "pending"
  | "manual_review"
  | "amount_mismatch"
  | "approved"
  | "rejected";

export type AssetType = "image" | "video" | "audio";

export type UserRole = "user" | "admin";
export type PlanTier = "free" | "pro" | "b2b";

export type PaymentDecision = "approved" | "rejected";

export interface WalletSummary {
  balance: number;
  unlimited: boolean;
}

export interface CreditLedgerEntry {
  id: string;
  type: "purchase" | "generation" | "bonus" | "adjustment";
  creditDelta: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}
