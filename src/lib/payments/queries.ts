import "server-only";

import { requireAdmin } from "@/lib/auth";
import { getPrivateObjectUrl } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getPendingPayments() {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("pago_movil_proofs")
    .select("id,user_id,package_id,credits,expected_amount_bs,extracted_amount_bs,extracted_reference,extracted_date,receipt_key,status,review_note,created_at")
    .in("status", ["pending", "manual_review", "amount_mismatch"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(`No se pudieron consultar los comprobantes: ${error.message}`);
  return Promise.all((data ?? []).map(async (payment) => ({
    ...payment,
    receiptUrl: await getPrivateObjectUrl(payment.receipt_key, 600),
  })));
}

