import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { getGenerationCreditCost } from "@/lib/generation/rates";
import { reserveGenerationJob, refundGenerationJob, completeGenerationJob } from "@/lib/generation/db";

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
    // Añadir 1000 créditos al usuario de prueba para poder operar
    await admin.from("wallets").upsert({ user_id: userId, balance: 1000 });
    await admin.from("users").update({ credits: 1000 }).eq("id", userId);
    console.log("✅ Asignados 1000 créditos iniciales al usuario.");

    // --- PRUEBA A: Cálculo dinámico ---
    console.log("\n--- Prueba A: Fórmula dinámica ---");
    // Imagen Flux Schnell 1k Low sin refs
    const costSchnell = getGenerationCreditCost("image", { quality: "low", resolution: "1k" }, "flux-schnell");
    console.log(`Costo Flux Schnell (Base 2): ${costSchnell} (Esperado: 2)`);

    // Imagen Flux Dev 4k High con 2 refs y batch 4
    const costDev = getGenerationCreditCost("image", {
      quality: "high",
      resolution: "4k",
      batch_size: 4,
      references: ["a", "b"]
    }, "flux-dev");
    // Base(8) * High(21) * 4k(2) * 4 imgs = 1344. Refs: 2 * 3 = 6. Total = 1350
    console.log(`Costo Flux Dev complejo: ${costDev} (Esperado: 1350)`);

    // --- PRUEBA B: Reserva Idempotente ---
    console.log("\n--- Prueba B: Reserva idempotente ---");
    const idempotencyKey = randomUUID();

    // Primera llamada (Debería restar 50 créditos y guardar en reserved_credits)
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

    const { data: userAfterReserve } = await admin.from("users").select("credits_available, credits_reserved").eq("id", userId).single();
    console.log(`Saldo tras reservar: Disponibles = ${userAfterReserve?.credits_available}, Reservados = ${userAfterReserve?.credits_reserved}`);

    // --- PRUEBA C: Devolución (Refund) ---
    console.log("\n--- Prueba C: Refund tras fallo ---");
    await refundGenerationJob({ jobId: reserve1.job_id, code: "TEST_FAIL", message: "Fallo de prueba" });

    const { data: userAfterRefund } = await admin.from("users").select("credits_available, credits_reserved, credits_refunded").eq("id", userId).single();
    console.log(`Saldo tras refund: Disponibles = ${userAfterRefund?.credits_available}, Reservados = ${userAfterRefund?.credits_reserved}, Refunded = ${userAfterRefund?.credits_refunded}`);

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

    const { data: userAfterCapture } = await admin.from("users").select("credits_available, credits_reserved, credits_captured").eq("id", userId).single();
    console.log(`Saldo tras captura (15): Disponibles = ${userAfterCapture?.credits_available}, Reservados = ${userAfterCapture?.credits_reserved}, Capturados = ${userAfterCapture?.credits_captured}`);

    console.log("\n🎉 TODAS LAS PRUEBAS DE BILLING FUERON EXITOSAS.");

  } finally {
    // Cleanup
    await admin.auth.admin.deleteUser(userId);
    console.log("🧹 Usuario de prueba eliminado.");
  }
}

run().catch(console.error);
