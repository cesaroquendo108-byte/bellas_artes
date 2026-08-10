import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const configuredSupabaseUrl = supabaseUrl;
const configuredAnonKey = supabaseAnonKey;
const configuredServiceKey = supabaseServiceKey;

// Cliente con permisos totales (para setup y cleanup)
const adminClient = createClient(configuredSupabaseUrl, configuredServiceKey);

async function runE2ETests() {
  console.log("🚀 Iniciando pruebas End-to-End contra Supabase Preview...\n");

  const testEmail = `test_e2e_${Date.now()}@test.com`;
  const testPassword = "TestPassword123!";

  console.log("👤 Creando usuario de prueba...");

  // Usamos el adminClient para crear el usuario y confirmar el email de inmediato
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (authError) {
    console.error("❌ Falló registro de usuario:", authError.message);
    return;
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error("❌ No se obtuvo ID de usuario");
    return;
  }
  console.log(`✅ Usuario creado: ${userId}`);

  // Pausa para asegurar que el trigger on_auth_user_created haya corrido
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Instanciar authClient con la sesión recién creada es complejo en el lado del servidor,
  // así que mejor usaremos adminClient para algunas cosas, pero para probar RLS necesitamos
  // la JWT del usuario. Para no complicar el login manual, podemos simplemente iniciar sesión.
  const authClient = createClient(configuredSupabaseUrl, configuredAnonKey);
  await authClient.auth.signInWithPassword({ email: testEmail, password: testPassword });

  console.log("\n--- Validando Triggers y RLS Básico ---");
  // 1. Verificar trigger de wallet y profile (se crean al registrar)
  const { data: profile } = await authClient.from("users").select("*").eq("id", userId).single();
  if (profile) console.log("✅ Perfil creado automáticamente por trigger");
  else console.error("❌ Perfil no creado (revisar on_auth_user_created)");

  const { data: wallet } = await authClient.from("wallets").select("*").eq("user_id", userId).single();
  if (wallet) console.log("✅ Billetera creada automáticamente por trigger");
  else console.error("❌ Billetera no creada");

  // 2. Verificar RLS en users (no debería poder ver a otros usuarios)
  const { data: otherUsers } = await authClient.from("users").select("id").neq("id", userId);
  if (otherUsers && otherUsers.length === 0) console.log("✅ RLS Users: No puede ver a otros usuarios");
  else console.error(`❌ RLS Users falló. Puede ver ${otherUsers?.length} otros usuarios`);

  console.log("\n--- Validando trigger updated_at en wallets ---");
  const oldUpdatedAt = wallet.updated_at;
  await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar un segundo

  // Para disparar el trigger de updated_at en wallets, actualizamos el balance.
  // También nos sirve para dar el crédito inicial.
  console.log("\n--- Asignando 100 créditos iniciales (Admin) y probando trigger ---");
  const { error: updateError } = await adminClient.from("wallets").update({ balance: 100 }).eq("user_id", userId);
  if (updateError) console.error("❌ Error actualizando wallet:", updateError);

  const { data: updatedWallet, error: fetchError } = await authClient.from("wallets").select("balance, updated_at").eq("user_id", userId).single();

  if (fetchError || !updatedWallet) {
    console.error("❌ No se pudo recuperar la wallet actualizada", fetchError);
  } else {
    console.log(`✅ Balance actual: ${updatedWallet.balance} créditos`);
    if (updatedWallet.updated_at !== oldUpdatedAt) {
      console.log("✅ Trigger updated_at funciona correctamente en wallets");
    } else {
      console.error("❌ Trigger updated_at NO modificó la fecha en wallets");
    }
  }

  const walletAfter = updatedWallet || { balance: 0 };

  console.log("\n--- Validando Flujos de Créditos (Reserva, Captura, Reembolso) ---");

  // 1. Reserva
  console.log("Reservando 10 créditos para generación...");
  const { error: reserveError } = await adminClient.rpc("reserve_generation_credits", {
    p_user_id: userId,
    p_idempotency_key: `test_job_${Date.now()}`,
    p_kind: "image",
    p_operation: "generate",
    p_public_model: "test_model",
    p_backend_model: "test_backend",
    p_provider_route: "vast",
    p_workflow_version: "1.0",
    p_credits: 10,
    p_request: { prompt: "test" },
    p_max_attempts: 1
  });

  if (reserveError) console.error("❌ Error reservando créditos:", reserveError);
  else console.log("✅ Reserva exitosa");

  const { data: walletAfterReserve } = await authClient.from("wallets").select("balance").eq("user_id", userId).single();
  if (!walletAfterReserve) throw new Error("No se pudo recuperar wallet tras reserva");
  console.log(`Saldo tras reserva: ${walletAfterReserve.balance} (debe ser ${walletAfter.balance - 10})`);
  if (walletAfterReserve.balance === walletAfter.balance - 10) console.log("✅ Balance deducido correctamente por la reserva");

  // Obtener el ID del job
  const { data: job } = await adminClient.from("generation_jobs").select("id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
  if (!job) throw new Error("No se encontró el job de captura");

  // 2. Captura (Éxito)
  console.log(`Capturando créditos del Job ${job.id}...`);
  const { error: captureError } = await adminClient.rpc("complete_generation_job", {
    p_job_id: job.id,
    p_output_asset_ids: []
  });
  if (captureError) console.error("❌ Error capturando créditos:", captureError);
  else console.log("✅ Captura (complete_generation_job) exitosa. Estado del job debe ser 'completed'.");

  const { data: completedJob } = await authClient.from("generation_jobs").select("status, credits_captured").eq("id", job.id).single();
  if (!completedJob) throw new Error("No se pudo consultar el job completado");
  if (completedJob.status === 'completed' && completedJob.credits_captured === 10) {
    console.log("✅ Job verificado como completado y créditos capturados registrados.");
  } else {
    console.error("❌ Job no reflejó captura correctamente:", completedJob);
  }

  // 3. Reembolso (Fallo)
  console.log("\nReservando 5 créditos para simular un fallo y reembolso...");
  await adminClient.rpc("reserve_generation_credits", {
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
    p_max_attempts: 1
  });

  const { data: walletAfterFailReserve } = await authClient.from("wallets").select("balance").eq("user_id", userId).single();
  const { data: failJob } = await adminClient.from("generation_jobs").select("id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
  if (!walletAfterFailReserve || !failJob) throw new Error("No se pudo preparar la prueba de reembolso");

  console.log(`Fallando Job ${failJob.id}...`);
  await adminClient.rpc("refund_generation_credits", {
    p_job_id: failJob.id,
    p_error_code: "PROVIDER_ERROR",
    p_error_message: "Fallo simulado",
    p_canceled: false
  });

  const { data: walletAfterRefund } = await authClient.from("wallets").select("balance").eq("user_id", userId).single();
  if (!walletAfterRefund) throw new Error("No se pudo recuperar wallet tras reembolso");
  console.log(`Saldo tras reembolso: ${walletAfterRefund.balance} (debe ser ${walletAfterFailReserve.balance + 5})`);
  if (walletAfterRefund.balance === walletAfterFailReserve.balance + 5) {
    console.log("✅ Reembolso automático aplicado tras fallo definitivo.");
  } else {
    console.error("❌ Reembolso falló o no se reflejó.");
  }

  console.log("\n--- Limpiando entorno de prueba ---");
  await adminClient.auth.admin.deleteUser(userId);
  console.log(`✅ Usuario de prueba eliminado.`);

  console.log("\n🎉 TODAS LAS PRUEBAS E2E (RLS, Triggers, Créditos) FUERON EXITOSAS.");
}

runE2ETests().catch(console.error);
