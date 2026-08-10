import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPreview() {
  console.log("=== Verificando Supabase Preview ===");

  // 1. Verificar que las tablas existan
  console.log("\n1. Verificando Tablas (Migrations 0000-0006)...");
  const { error: usersError } = await supabase.from("users").select("id").limit(1);
  if (usersError) console.error("❌ Error users table:", usersError.message);
  else console.log("✅ Tabla users OK");

  const { error: jobsError } = await supabase.from("generation_jobs").select("id").limit(1);
  if (jobsError) console.error("❌ Error generation_jobs table (Migration 0006 missing?):", jobsError.message);
  else console.log("✅ Tabla generation_jobs OK");

  // 2. Verificar funciones RPC (reserva de créditos)
  console.log("\n2. Verificando RPCs de Créditos...");
  const dummyUserId = "00000000-0000-0000-0000-000000000000";
  const { error: rpcError } = await supabase.rpc("reserve_generation_credits", {
    p_user_id: dummyUserId,
    p_idempotency_key: "test-key-123",
    p_kind: "image",
    p_operation: "test",
    p_public_model: "test-model",
    p_backend_model: "test-backend",
    p_provider_route: "vast",
    p_workflow_version: "1.0",
    p_credits: 5,
    p_request: { test: true },
    p_max_attempts: 3
  });

  if (rpcError) {
    if (rpcError.code === "P0001" || rpcError.code === "23503" || rpcError.message.includes("Usuario no encontrado") || rpcError.message.includes("invalid input syntax")) {
       console.log("✅ RPC reserve_generation_credits existe (falló con error esperado de validación: " + rpcError.message + ")");
    } else {
       console.error("❌ Error inesperado en RPC (¿falta aplicar 0006?):", rpcError);
    }
  } else {
    console.log("⚠️ RPC reserve_generation_credits funcionó (inesperado sin un usuario real).");
  }

  console.log("\n=== Verificación completada ===");
}

verifyPreview().catch(console.error);
