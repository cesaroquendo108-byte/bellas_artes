import "server-only";

import type { CreditPackageId } from "@/lib/types";

export const CREDIT_PACKAGES = {
  curioso: {
    id: "curioso",
    name: "Curioso",
    priceUsd: 2,
    credits: 600,
  },
  creador: {
    id: "creador",
    name: "Creador",
    priceUsd: 5,
    credits: 1_600,
  },
  estudio: {
    id: "estudio",
    name: "Estudio",
    priceUsd: 10,
    credits: 3_500,
  },
} as const satisfies Record<CreditPackageId, {
  id: CreditPackageId;
  name: string;
  priceUsd: number;
  credits: number;
}>;

export function isCreditPackageId(value: string): value is CreditPackageId {
  return value in CREDIT_PACKAGES;
}

export function getCreditPackage(id: CreditPackageId) {
  return CREDIT_PACKAGES[id];
}
