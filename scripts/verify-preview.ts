import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Faltan credenciales de Supabase en .env.local.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPreview() {
  console.log("=== Verificando esquema Supabase Preview ===");

  console.log("\n1. Verificando tablas operativas...");
  await assertTable("users", "id");
  await assertTable("wallets", "user_id");
  await assertTable("generation_jobs", "id");
  await assertTable("user_consents", "user_id");
  await assertTable("generation_moderation_events", "id");
  await assertTable("generation_moderation_events", "retention_expires_at");
  console.log("✅ Tablas base, generación, consentimiento y auditoría OK");

  console.log("\n2. Verificando RPC de créditos...");
  const dummyUserId = "00000000-0000-0000-0000-000000000000";
  const { data: reservation, error: rpcError } = await supabase.rpc("reserve_generation_credits", {
    p_user_id: dummyUserId,
    p_idempotency_key: `preview-verification-${Date.now()}`,
    p_kind: "image",
    p_operation: "test",
    p_public_model: "test-model",
    p_backend_model: "test-backend",
    p_provider_route: "vast",
    p_workflow_version: "1.0",
    p_credits: 5,
    p_request: { test: true },
    p_max_attempts: 3,
  });

  if (!rpcError) {
    throw new Error(`reserve_generation_credits aceptó un usuario inexistente: ${JSON.stringify(reservation)}`);
  }
  const expectedValidationError = rpcError.code === "P0001"
    || rpcError.code === "23503"
    || /usuario (inexistente|no encontrado)|invalid input syntax/i.test(rpcError.message);
  if (!expectedValidationError) {
    throw new Error(`reserve_generation_credits devolvió un error inesperado: ${rpcError.message}`);
  }
  console.log(`✅ RPC reserve_generation_credits existe y rechaza entrada inválida (${rpcError.code ?? "sin código"})`);

  console.log("\n3. Verificando retención de auditoría...");
  console.log("✅ La columna de vencimiento existe; este verificador no ejecuta podas ni muta datos.");

  console.log("\n=== Verificación completada sin fallos ===");
}

async function assertTable(table: string, column: string) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (error) throw new Error(`Tabla ${table} no disponible: ${error.message}`);
}

verifyPreview().catch((error) => {
  console.error("❌ Error fatal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
