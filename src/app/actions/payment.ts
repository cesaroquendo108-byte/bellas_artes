"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getPaymentRate } from "@/lib/bcvRate";
import {
  getCreditPackage,
  isCreditPackageId,
} from "@/lib/credits/packages";
import { extractReceiptData } from "@/lib/payments/extract";
import { classifyPayment } from "@/lib/payments/status";
import {
  deletePrivateObject,
  getPrivateObjectUrl,
  uploadPrivateObject,
} from "@/lib/storage/r2";
import type { PaymentDecision } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const ACCEPTED_RECEIPTS = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PaymentActionState = {
  ok: boolean;
  message: string;
  status?: string;
};

export async function submitPaymentForm(
  _previous: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const packageId = String(formData.get("packageId") ?? "");
  const receipt = formData.get("receipt");
  if (!isCreditPackageId(packageId) || !(receipt instanceof File)) {
    return { ok: false, message: "Selecciona un paquete y adjunta el comprobante." };
  }
  return submitPayment(packageId, receipt);
}

export async function submitPayment(
  packageId: "curioso" | "creador" | "estudio",
  receipt: File,
): Promise<PaymentActionState> {
  const { profile } = await requireUser();
  if (!ACCEPTED_RECEIPTS.has(receipt.type) || receipt.size <= 0) {
    return { ok: false, message: "Usa una imagen JPG, PNG o WebP legible." };
  }
  if (receipt.size > MAX_RECEIPT_BYTES) {
    return { ok: false, message: "El comprobante no puede superar 8 MB." };
  }

  const pkg = getCreditPackage(packageId);
  const bytes = new Uint8Array(await receipt.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const admin = createAdminClient();
  const { data: duplicateFile } = await admin
    .from("pago_movil_proofs")
    .select("id")
    .eq("receipt_sha256", sha256)
    .maybeSingle();
  if (duplicateFile) {
    return { ok: false, message: "Este comprobante ya fue enviado." };
  }

  let rate: number;
  try {
    rate = await getPaymentRate();
  } catch {
    return {
      ok: false,
      message: "No pudimos consultar la tasa BCV. Intenta nuevamente en unos minutos.",
    };
  }

  const expectedAmount = Math.round(pkg.priceUsd * rate * 100) / 100;
  const extension = receipt.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const key = `payment-proofs/${profile.id}/${randomUUID()}.${extension}`;

  try {
    await uploadPrivateObject({
      key,
      body: bytes,
      contentType: receipt.type,
      metadata: { userId: profile.id, packageId, sha256 },
    });

    let extraction = null;
    let extractionFailed = false;
    try {
      extraction = await extractReceiptData(await getPrivateObjectUrl(key, 600));
    } catch {
      extractionFailed = true;
    }

    let duplicateReference = false;
    if (extraction?.reference) {
      const { data } = await admin
        .from("pago_movil_proofs")
        .select("id")
        .eq("extracted_reference", extraction.reference)
        .neq("status", "rejected")
        .limit(1);
      duplicateReference = Boolean(data?.length);
    }

    const status = classifyPayment({
      extractionSucceeded: !extractionFailed,
      expectedAmount,
      extractedAmount: extraction?.amount ?? null,
      reference: extraction?.reference ?? null,
      duplicate: duplicateReference,
    });
    const { error } = await admin.from("pago_movil_proofs").insert({
      user_id: profile.id,
      package_id: packageId,
      price_usd: pkg.priceUsd,
      credits: pkg.credits,
      payment_rate: rate,
      expected_amount_bs: expectedAmount,
      extracted_amount_bs: extraction?.amount ?? null,
      extracted_reference: extraction?.reference ?? null,
      extracted_date: extraction?.date ?? null,
      receipt_key: key,
      receipt_sha256: sha256,
      mime_type: receipt.type,
      status,
      extraction: extraction ?? { error: "extraction_failed" },
      review_note: duplicateReference ? "Referencia posiblemente reutilizada." : null,
    });
    if (error) throw error;

    revalidatePath("/billing");
    revalidatePath("/admin/payments");
    return {
      ok: true,
      status,
      message: "Comprobante recibido. Lo revisaremos antes de acreditar los créditos.",
    };
  } catch {
    await deletePrivateObject(key).catch(() => undefined);
    return { ok: false, message: "No pudimos guardar el comprobante de forma segura." };
  }
}

export async function reviewPayment(
  paymentId: string,
  decision: PaymentDecision,
  note?: string,
) {
  const { profile } = await requireAdmin();
  if (!paymentId || !["approved", "rejected"].includes(decision)) {
    return { ok: false, message: "Decisión inválida." };
  }
  const { data, error } = await createAdminClient().rpc("review_payment", {
    p_payment_id: paymentId,
    p_reviewer: profile.id,
    p_decision: decision,
    p_note: note?.trim() || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/payments");
  revalidatePath("/credits");
  return { ok: true, data };
}

export async function reviewPaymentForm(formData: FormData) {
  const decision = String(formData.get("decision")) as PaymentDecision;
  await reviewPayment(
    String(formData.get("paymentId") ?? ""),
    decision,
    String(formData.get("note") ?? ""),
  );
}
