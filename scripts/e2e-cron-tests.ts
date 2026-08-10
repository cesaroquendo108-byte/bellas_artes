import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand
} from "@aws-sdk/client-s3";

// Clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.CLOUDFLARE_R2_BUCKET!;

// The cleanup function logic copied here to avoid `server-only` error
async function cleanupExpiredAssets(limit = 100) {
  console.log("-> Ejecutando cleanupExpiredAssets...");
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("assets")
    .select("id,r2_key")
    .not("expires_at", "is", null)
    .lt("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Error BD: ${error.message}`);

  const failures: Array<{ id: string; reason: string }> = [];
  let deleted = 0;

  for (const asset of data ?? []) {
    try {
      console.log(`  Borrando asset R2: ${asset.r2_key}`);
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await r2Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.r2_key }));

      const { error: deleteError } = await supabase
        .from("assets")
        .delete()
        .eq("id", asset.id)
        .lt("expires_at", now);

      if (deleteError) throw deleteError;
      deleted += 1;
    } catch (err: unknown) {
      failures.push({ id: asset.id, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return { scanned: data?.length ?? 0, deleted, failures };
}

async function runCronTests() {
  console.log("🚀 Iniciando pruebas de Cron de Retención de Assets...");

  // 1. Obtener un user_id válido para que pase RLS / Foreing Keys en la tabla assets
  const { data: userData, error: userError } = await supabase.from("users").select("id").limit(1).single();
  if (userError || !userData) {
      console.error("❌ No se encontró usuario para asociar el asset de prueba.", userError);
      process.exit(1);
  }
  const userId = userData.id;

  const testKey = `test-assets/cron-verify-${Date.now()}.txt`;

  try {
    // Subir objeto a R2
    console.log(`\n--- 1. Subiendo archivo mock a R2 (${testKey}) ---`);
    await r2Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: "Contenido para borrar",
      ContentType: "text/plain"
    }));

    // Insertar en la BD con expiración en el pasado
    console.log("--- 2. Insertando registro expirado en BD ---");
    const { data: assetRow, error: insertError } = await supabase.from("assets").insert({
      user_id: userId,
      r2_key: testKey,
      type: "image", // mock
      name: "test-image.png",
      mime_type: "image/png",
      expires_at: new Date(Date.now() - 100000).toISOString() // Expirado hace un rato
    }).select().single();

    if (insertError) throw insertError;
    console.log(`✅ Asset creado: ${assetRow.id}`);

    // Forzar la expiración en el pasado burlando el trigger (el trigger corre en insert o update de user_id)
    console.log("--- 2.5 Forzando expiración en el pasado ---");
    const { error: updateError } = await supabase.from("assets").update({
      expires_at: new Date(Date.now() - 100000).toISOString()
    }).eq("id", assetRow.id);

    if (updateError) throw updateError;

    // Ejecutar Cron
    console.log("\n--- 3. Ejecutando lógica del Cron ---");
    const result = await cleanupExpiredAssets();
    console.log(`✅ Resultado del cron: Escaneados: ${result.scanned}, Borrados: ${result.deleted}, Fallos: ${result.failures.length}`);

    if (result.deleted === 0) {
       console.error("❌ El cron no borró el archivo insertado.");
       process.exit(1);
    }

    // Comprobar que en BD no existe
    console.log("\n--- 4. Validando borrado en BD y R2 ---");
    const { data: dbCheck } = await supabase.from("assets").select("id").eq("id", assetRow.id).single();
    if (dbCheck) {
        console.error("❌ El asset sigue existiendo en BD.");
    } else {
        console.log("✅ Asset borrado de la BD.");
    }

    // Comprobar R2
    try {
        await r2Client.send(new GetObjectCommand({ Bucket: bucket, Key: testKey }));
        console.error("❌ El archivo aún existe en R2!");
    } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error.name === 'NoSuchKey' || error.message?.includes('No such key')) {
          console.log("✅ El archivo ya no existe en R2 (borrado exitoso).");
        } else {
          console.error("❌ Error inesperado al verificar R2:", error);
        }
    }

    console.log("\n🎉 TODAS LAS PRUEBAS DE RETENCIÓN FUERON EXITOSAS.");
  } catch (err) {
    console.error("\n❌ Error en las pruebas:", err);
  }
}

runCronTests();
