import "server-only";

import { requireUser } from "@/lib/auth";
import {
  buildSeekFilter,
  decodeSeekCursor,
  encodeSeekCursor,
} from "@/lib/pagination/cursor";
import type { CreditLedgerEntry, WalletSummary } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export async function getWalletSummary(): Promise<WalletSummary> {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo consultar la billetera: ${error.message}`);
  return { balance: Number(data?.balance ?? 0), unlimited: profile.role === "admin" };
}

export async function getCreditLedger(cursor?: string, limit = 20) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  let query = supabase
    .from("transactions")
    .select("id,type,credit_delta,balance_after,description,created_at")
    .eq("user_id", profile.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);

  const seekCursor = decodeSeekCursor(cursor);
  if (seekCursor) query = query.or(buildSeekFilter(seekCursor));
  const { data, error } = await query;
  if (error) throw new Error(`No se pudo consultar el historial: ${error.message}`);

  const hasMore = (data?.length ?? 0) > safeLimit;
  const rows = (data ?? []).slice(0, safeLimit);
  return {
    entries: rows.map((row): CreditLedgerEntry => ({
      id: row.id,
      type: normalizeTransactionType(row.type),
      creditDelta: Number(row.credit_delta ?? 0),
      balanceAfter: Number(row.balance_after ?? 0),
      description: row.description,
      createdAt: row.created_at,
    })),
    nextCursor: hasMore && rows.at(-1)
      ? encodeSeekCursor({
          createdAt: rows.at(-1)!.created_at,
          id: rows.at(-1)!.id,
        })
      : null,
  };
}

function normalizeTransactionType(type: string): CreditLedgerEntry["type"] {
  if (type === "credit_purchase") return "purchase";
  if (type === "inference_cost") return "generation";
  if (["purchase", "generation", "bonus", "adjustment"].includes(type)) {
    return type as CreditLedgerEntry["type"];
  }
  return "adjustment";
}
