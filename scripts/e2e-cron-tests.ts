import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET",
] as const;
for (const name of requiredEnv) {
  if (!process.env[name]?.trim()) throw new Error(`Falta ${name} en .env.local.`);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
if (!/sandbox|preview|staging|test/i.test(bucket)) {
  throw new Error("El E2E de cron sólo puede escribir en un bucket sandbox/preview/staging/test.");
}
if (process.env.R2_E2E_ALLOW_WRITE !== "true") {
  throw new Error("Define R2_E2E_ALLOW_WRITE=true para autorizar el E2E temporal de cron.");
}

async function cleanupExpiredAssets(limit = 100) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("assets")
    .select("id,r2_key")
    .not("expires_at", "is", null)
    .lt("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Error consultando assets expirados: ${error.message}`);

  const failures: Array<{ id: string; reason: string }> = [];
  let deleted = 0;
  for (const asset of data ?? []) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.r2_key }));
      const { error: deleteError } = await supabase
        .from("assets")
        .delete()
        .eq("id", asset.id)
        .lt("expires_at", now);
      if (deleteError) throw deleteError;
      deleted += 1;
    } catch (error) {
      failures.push({ id: asset.id, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { scanned: data?.length ?? 0, deleted, failures };
}

async function runCronTests() {
  console.log("🚀 Iniciando pruebas E2E de retención de assets...");
  const { data: userData, error: userError } = await supabase.from("users").select("id").limit(1).maybeSingle();
  if (userError || !userData) throw new Error(`No se encontró usuario de prueba: ${userError?.message ?? "sin usuarios"}`);

  const testKey = `test-assets/cron-verify-${Date.now()}.txt`;
  let uploaded = false;
  let assetId: string | null = null;
  let failure: unknown = null;

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: "Contenido para borrar",
      ContentType: "text/plain",
    }));
    uploaded = true;

    const { data: assetRow, error: insertError } = await supabase.from("assets").insert({
      user_id: userData.id,
      r2_key: testKey,
      type: "image",
      name: "test-image.png",
      mime_type: "image/png",
      expires_at: new Date(Date.now() - 100_000).toISOString(),
    }).select("id").single();
    if (insertError || !assetRow) throw new Error(`No se pudo insertar asset expirado: ${insertError?.message ?? "sin fila"}`);
    assetId = assetRow.id;

    const result = await cleanupExpiredAssets();
    if (result.failures.length) throw new Error(`El cron reportó fallos: ${JSON.stringify(result.failures)}`);
    if (result.deleted < 1) throw new Error("El cron no borró el asset insertado.");
    uploaded = false;

    const { data: dbCheck, error: dbCheckError } = await supabase.from("assets").select("id").eq("id", assetId).maybeSingle();
    if (dbCheckError) throw new Error(`No se pudo verificar el borrado en BD: ${dbCheckError.message}`);
    if (dbCheck) throw new Error("El asset sigue existiendo en BD.");

    try {
      await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: testKey }));
      throw new Error("El archivo aún existe en R2.");
    } catch (error) {
      if (error instanceof Error && error.message === "El archivo aún existe en R2.") throw error;
      const r2Error = error as { name?: string; message?: string };
      if (r2Error.name !== "NoSuchKey" && !r2Error.message?.includes("No such key")) {
        throw new Error(`Error inesperado verificando R2: ${r2Error.message ?? r2Error.name ?? "desconocido"}`);
      }
    }

    console.log(`🎉 Retención E2E exitosa: ${result.deleted} asset eliminado de BD y R2.`);
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (assetId) {
      const { error } = await supabase.from("assets").delete().eq("id", assetId);
      if (error) console.error(`⚠️ No se pudo limpiar el registro temporal: ${error.message}`);
    }
    if (uploaded) await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey })).catch((error) => {
      if (!failure) throw error;
      console.error("⚠️ No se pudo limpiar el objeto temporal de R2.");
    });
  }
}

runCronTests().catch((error) => {
  console.error("❌ Error fatal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
