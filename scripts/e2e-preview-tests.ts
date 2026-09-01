import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error("Faltan credenciales de Supabase en .env.local.");
}
if (process.env.SUPABASE_E2E_ALLOW_WRITE !== "true") {
  throw new Error("Define SUPABASE_E2E_ALLOW_WRITE=true para autorizar el E2E temporal de Supabase.");
}

const configuredSupabaseUrl = supabaseUrl;
const configuredAnonKey = supabaseAnonKey;
const configuredServiceKey = supabaseServiceKey;
const adminClient = createClient(configuredSupabaseUrl, configuredServiceKey);

async function assertQuery<T>(
  label: string,
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  if (data === null) throw new Error(`${label}: la consulta no devolvió datos.`);
  return data;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function waitForProfile(userId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await adminClient.from("users").select("id").eq("id", userId).maybeSingle();
    if (error) throw new Error(`No se pudo consultar el perfil: ${error.message}`);
    if (data) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("El trigger de perfil no creó el usuario dentro del tiempo esperado.");
}

async function runE2ETests() {
  console.log("🚀 Iniciando pruebas End-to-End contra Supabase Preview...\n");

  const testEmail = `test_e2e_${Date.now()}@test.com`;
  const testPassword = "TestPassword123!";
  let userId: string | null = null;
  let failure: unknown = null;

  try {
    console.log("👤 Creando usuario de prueba...");
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      throw new Error(`Falló el registro de usuario: ${authError?.message ?? "no se obtuvo el usuario"}`);
    }
    userId = authData.user.id;
    console.log(`✅ Usuario de prueba creado: ${userId}`);

    const authClient = createClient(configuredSupabaseUrl, configuredAnonKey);
    const { error: signInError } = await authClient.auth.signInWithPassword({ email: testEmail, password: testPassword });
    if (signInError) throw new Error(`No se pudo iniciar sesión con el usuario de prueba: ${signInError.message}`);

    await waitForProfile(userId);
    console.log("✅ Perfil creado automáticamente por trigger");

    const wallet = await assertQuery<{ balance: number; updated_at: string }>(
      "No se pudo consultar la billetera inicial",
      authClient.from("wallets").select("balance,updated_at").eq("user_id", userId).single(),
    );
    console.log("✅ Billetera creada automáticamente por trigger");

    const { data: otherUsers, error: otherUsersError } = await authClient.from("users").select("id").neq("id", userId);
    if (otherUsersError) throw new Error(`No se pudo verificar RLS de usuarios: ${otherUsersError.message}`);
    assert((otherUsers ?? []).length === 0, `RLS de usuarios falló: puede ver ${(otherUsers ?? []).length} usuarios ajenos.`);
    console.log("✅ RLS Users: no puede ver a otros usuarios");

    await new Promise((resolve) => setTimeout(resolve, 1_100));
    const { error: updateError } = await adminClient.from("wallets").update({ balance: 100 }).eq("user_id", userId);
    if (updateError) throw new Error(`No se pudo asignar el saldo de prueba: ${updateError.message}`);

    const updatedWallet = await assertQuery<{ balance: number; updated_at: string }>(
      "No se pudo consultar la billetera actualizada",
      authClient.from("wallets").select("balance,updated_at").eq("user_id", userId).single(),
    );
    assert(Number(updatedWallet.balance) === 100, `Saldo inicial inesperado: ${updatedWallet.balance}`);
    assert(updatedWallet.updated_at !== wallet.updated_at, "El trigger updated_at no modificó la billetera.");
    console.log("✅ Balance inicial y trigger updated_at verificados");

    console.log("\n--- Validando reserva, captura y reembolso ---");
    const reserveKey = `test_job_${Date.now()}`;
    const reservation = await assertQuery<{ job_id: string; reserved_credits: number }>(
      "No se pudo reservar créditos",
      adminClient.rpc("reserve_generation_credits", {
        p_user_id: userId,
        p_idempotency_key: reserveKey,
        p_kind: "image",
        p_operation: "generate",
        p_public_model: "test_model",
        p_backend_model: "test_backend",
        p_provider_route: "vast",
        p_workflow_version: "1.0",
        p_credits: 10,
        p_request: { prompt: "test" },
        p_max_attempts: 1,
      }),
    );
    assert(reservation.job_id, "La reserva no devolvió job_id.");
    assert(Number(reservation.reserved_credits) === 10, "La reserva no reflejó 10 créditos.");

    const walletAfterReserve = await assertQuery<{ balance: number }>(
      "No se pudo consultar la billetera tras reservar",
      authClient.from("wallets").select("balance").eq("user_id", userId).single(),
    );
    assert(Number(walletAfterReserve.balance) === 90, `Saldo tras reserva inesperado: ${walletAfterReserve.balance}`);
    console.log(`✅ Reserva aplicada: job=${reservation.job_id}, saldo=${walletAfterReserve.balance}`);

    await assertQuery("No se pudo completar el job", adminClient.rpc("complete_generation_job", {
      p_job_id: reservation.job_id,
      p_output_asset_ids: [],
    }));
    const completedJob = await assertQuery<{ status: string; credits_captured: number }>(
      "No se pudo consultar el job completado",
      adminClient.from("generation_jobs").select("status,credits_captured").eq("id", reservation.job_id).single(),
    );
    assert(completedJob.status === "completed", `Estado de captura inesperado: ${completedJob.status}`);
    assert(Number(completedJob.credits_captured) === 10, `Créditos capturados inesperados: ${completedJob.credits_captured}`);
    console.log("✅ Captura verificada");

    const refundReservation = await assertQuery<{ job_id: string }>(
      "No se pudo crear la reserva de reembolso",
      adminClient.rpc("reserve_generation_credits", {
        p_user_id: userId,
        p_idempotency_key: `fail_job_${Date.now()}`,
        p_kind: "image",
        p_operation: "generate",
        p_public_model: "test_model",
        p_backend_model: "test_backend",
        p_provider_route: "vast",
        p_workflow_version: "1.0",
        p_credits: 5,
        p_request: { prompt: "fail" },
        p_max_attempts: 1,
      }),
    );
    await assertQuery("No se pudo reembolsar el job", adminClient.rpc("refund_generation_credits", {
      p_job_id: refundReservation.job_id,
      p_error_code: "PROVIDER_ERROR",
      p_error_message: "Fallo simulado",
      p_canceled: false,
    }));
    const walletAfterRefund = await assertQuery<{ balance: number }>(
      "No se pudo consultar la billetera tras reembolso",
      authClient.from("wallets").select("balance").eq("user_id", userId).single(),
    );
    assert(Number(walletAfterRefund.balance) === 90, `Saldo tras reembolso inesperado: ${walletAfterRefund.balance}`);
    console.log("✅ Reembolso verificado");

    console.log("\n🎉 Todas las pruebas E2E de RLS, triggers y créditos fueron exitosas.");
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (userId) {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error && !failure) throw new Error(`No se pudo limpiar el usuario de prueba: ${error.message}`);
      if (error) console.error(`⚠️ No se pudo limpiar el usuario de prueba: ${error.message}`);
      else console.log("🧹 Usuario de prueba eliminado.");
    }
  }
}

runE2ETests().catch((error) => {
  console.error("❌ Error fatal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
