import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { getGenerationCreditCost } from "@/lib/generation/rates";
import { reserveGenerationJob, refundGenerationJob, completeGenerationJob } from "@/lib/generation/db";

if (process.env.SUPABASE_E2E_ALLOW_WRITE !== "true") {
  throw new Error("Define SUPABASE_E2E_ALLOW_WRITE=true para autorizar el E2E temporal de Supabase.");
}

async function assertQuery<T>(label: string, query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  if (data === null) throw new Error(`${label}: la consulta no devolvió datos.`);
  return data;
}

async function run() {
  console.log("🚀 Iniciando pruebas E2E de Billing y Créditos\n");

  const admin = createAdminClient();

  // 1. Crear un usuario de prueba rápido y asignarle créditos
  const testEmail = `billing-test-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: testEmail,
    password: "password123",
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error("No se pudo crear usuario de prueba: " + (authError?.message || "Desconocido"));
  }

  const userId = authData.user.id;
  console.log(`✅ Usuario de prueba creado: ${userId}`);

  try {
    // Sembrar créditos mediante el ledger transaccional, igual que el producto.
    await assertQuery("No se pudieron asignar créditos", admin.rpc("apply_credit_delta", {
      p_user_id: userId,
      p_delta: 1000,
      p_type: "bonus",
      p_description: "Créditos iniciales de prueba E2E",
      p_metadata: { source: "e2e-billing-tests" },
      p_actor_id: null,
    }));
    console.log("✅ Asignados 1000 créditos iniciales al usuario.");

    // --- PRUEBA A: Cálculo dinámico ---
    console.log("\n--- Prueba A: Fórmula dinámica ---");
    // Imagen Flux Schnell 1k Low sin refs
    const costSchnell = getGenerationCreditCost("image", { quality: "low", resolution: "1k" }, "flux-schnell");
    if (costSchnell !== 1) throw new Error(`Costo inesperado para Flux Schnell: ${costSchnell}`);
    console.log(`Costo Flux Schnell: ${costSchnell} (esperado: 1)`);

    // Imagen Flux Dev 4k High con 2 refs y batch 4
    const costDev = getGenerationCreditCost("image", {
      quality: "high",
      resolution: "4k",
      batch_size: 4,
      references: ["a", "b"]
    }, "flux-dev");
    // Base(8) * High(21) * 4k(2) * 4 imgs = 1344. Refs: 2 * 3 = 6. Total = 1350
    if (costDev !== 1350) throw new Error(`Costo inesperado para Flux Dev: ${costDev}`);
    console.log(`Costo Flux Dev complejo: ${costDev} (esperado: 1350)`);

    // --- PRUEBA B: Reserva Idempotente ---
    console.log("\n--- Prueba B: Reserva idempotente ---");
    const idempotencyKey = randomUUID();

    // Primera llamada (debe restar 50 créditos de la wallet)
    const reserve1 = await reserveGenerationJob({
      userId,
      idempotencyKey,
      kind: "video",
      route: { publicModel: "hunyuan", backendModel: "hunyuan-video-8.3b", providerRoute: "fake", credits: 50, workflowVersion: "test" },
      request: {},
      maxAttempts: 3,
      billingMode: "live"
    });
    console.log(`Reserva inicial: Job ${reserve1.job_id}, Reserved: ${reserve1.reserved_credits}`);

    // Segunda llamada con la misma key (No debe descontar de nuevo)
    const reserve2 = await reserveGenerationJob({
      userId,
      idempotencyKey,
      kind: "video",
      route: { publicModel: "hunyuan", backendModel: "hunyuan-video-8.3b", providerRoute: "fake", credits: 50, workflowVersion: "test" },
      request: {},
      maxAttempts: 3,
      billingMode: "live"
    });
    console.log(`Reserva idempotente: Mismo Job ID? ${reserve1.job_id === reserve2.job_id}`);

    const userAfterReserve = await assertQuery<{ balance: number }>("No se pudo consultar la wallet tras reservar", admin.from("wallets").select("balance").eq("user_id", userId).single());
    if (Number(userAfterReserve.balance) !== 950) throw new Error(`La reserva dejó un saldo inesperado: ${userAfterReserve.balance}`);
    console.log(`Saldo tras reservar: ${userAfterReserve.balance}`);

    // --- PRUEBA C: Devolución (Refund) ---
    console.log("\n--- Prueba C: Refund tras fallo ---");
    await refundGenerationJob({ jobId: reserve1.job_id, code: "TEST_FAIL", message: "Fallo de prueba" });

    const userAfterRefund = await assertQuery<{ balance: number }>("No se pudo consultar la wallet tras reembolso", admin.from("wallets").select("balance").eq("user_id", userId).single());
    if (Number(userAfterRefund.balance) !== 1000) throw new Error(`El reembolso dejó un saldo inesperado: ${userAfterRefund.balance}`);
    console.log(`Saldo tras refund: ${userAfterRefund.balance}`);

    // --- PRUEBA D: Captura ---
    console.log("\n--- Prueba D: Captura al completar ---");
    const captureJobId = (await reserveGenerationJob({
      userId,
      idempotencyKey: randomUUID(),
      kind: "image",
      route: { publicModel: "flux", backendModel: "flux-schnell", providerRoute: "fake", credits: 15, workflowVersion: "test" },
      request: {},
      maxAttempts: 3,
      billingMode: "live"
    })).job_id;

    await completeGenerationJob(captureJobId, []);

    const captureJob = await assertQuery<{ status: string; credits_reserved: number; credits_captured: number; credits_refunded: number }>("No se pudo consultar el job capturado", admin.from("generation_jobs").select("status,credits_reserved,credits_captured,credits_refunded").eq("id", captureJobId).single());
    const userAfterCapture = await assertQuery<{ balance: number }>("No se pudo consultar la wallet tras captura", admin.from("wallets").select("balance").eq("user_id", userId).single());
    if (captureJob.status !== "completed" || Number(captureJob.credits_reserved) !== 15 || Number(captureJob.credits_captured) !== 15 || Number(captureJob.credits_refunded) !== 0 || Number(userAfterCapture.balance) !== 985) {
      throw new Error(`La captura dejó un estado inesperado: ${JSON.stringify({ captureJob, balance: userAfterCapture.balance })}`);
    }
    console.log(`Saldo tras captura (15): ${userAfterCapture.balance}; job=${captureJob.status}`);

    console.log("\n🎉 TODAS LAS PRUEBAS DE BILLING FUERON EXITOSAS.");

  } finally {
    // Cleanup
    await admin.auth.admin.deleteUser(userId);
    console.log("🧹 Usuario de prueba eliminado.");
  }
}

run().catch((error) => {
  console.error("❌ Error fatal:", error);
  process.exitCode = 1;
});
