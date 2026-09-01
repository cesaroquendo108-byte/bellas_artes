import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const bucket = process.env.CLOUDFLARE_R2_SANDBOX_BUCKET!;

if (
  !process.env.CLOUDFLARE_R2_ACCOUNT_ID
  || !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  || !bucket
) {
  throw new Error("Faltan credenciales R2 o CLOUDFLARE_R2_SANDBOX_BUCKET en .env.local.");
}

if (!/sandbox|preview|staging|test/i.test(bucket)) {
  throw new Error("La prueba E2E de R2 sólo puede escribir en un bucket sandbox/preview/staging/test.");
}

if (process.env.R2_E2E_ALLOW_WRITE !== "true") {
  throw new Error("Define R2_E2E_ALLOW_WRITE=true para autorizar la prueba temporal de escritura.");
}

async function uploadPrivateObject(input: { key: string; body: Uint8Array; contentType: string; metadata?: Record<string, string> }) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    Metadata: input.metadata,
  }));
  return input.key;
}

async function getPrivateObjectUrl(key: string, expiresIn = 900) {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

async function downloadPrivateObject(key: string) {
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("El objeto privado no tiene contenido.");
  return new Uint8Array(await result.Body.transformToByteArray());
}

async function deletePrivateObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function runR2Tests() {
  console.log("🚀 Iniciando pruebas End-to-End contra Cloudflare R2...");
  const testKey = `test-assets/verify-${Date.now()}.txt`;
  const testContent = "Este es un archivo de prueba E2E para Bellas Artes.";
  const body = new TextEncoder().encode(testContent);

  let uploaded = false;

  try {
    // 1. Upload
    console.log(`\n--- 1. Subiendo archivo (${testKey}) ---`);
    await uploadPrivateObject({
      key: testKey,
      body,
      contentType: "text/plain",
      metadata: { purpose: "e2e-test" }
    });
    uploaded = true;
    console.log("✅ Archivo subido exitosamente a R2.");

    // 2. Generar URL Firmada
    console.log("\n--- 2. Generando Signed URL ---");
    const signedUrl = await getPrivateObjectUrl(testKey, 60);
    console.log("✅ Signed URL generada (valor oculto). ");

    // 3. Probar descarga cruda
    console.log("\n--- 3. Descargando contenido crudo ---");
    const downloaded = await downloadPrivateObject(testKey);
    const downloadedText = new TextDecoder().decode(downloaded);
    if (downloadedText !== testContent) throw new Error("El contenido descargado NO coincide con el original.");
    console.log("✅ El contenido descargado coincide con el original.");

    // 4. Testear HTTP fetch de la Signed URL
    console.log("\n--- 4. Probando acceso HTTP a la Signed URL ---");
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`Petición a la Signed URL falló: ${response.status} ${response.statusText}`);
    const fetchText = await response.text();
    if (fetchText !== testContent) throw new Error("La respuesta de la Signed URL no coincide con el original.");
    console.log("✅ Petición HTTP a la Signed URL fue exitosa y el contenido coincide.");

    // 5. Borrado
    console.log("\n--- 5. Borrando archivo seguro ---");
    await deletePrivateObject(testKey);
    uploaded = false;
    console.log("✅ Comando de borrado enviado.");

    // 6. Verificar borrado (debería dar error o no encontrarlo)
    try {
      await downloadPrivateObject(testKey);
      throw new Error("El archivo aún existe tras borrarlo.");
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "El archivo aún existe tras borrarlo.") throw err;
      const error = err as { name?: string; message?: string };
      if (error.name === 'NoSuchKey' || error.message?.includes('No such key')) {
        console.log("✅ El archivo ya no existe (borrado exitoso).");
      } else {
        throw new Error(`Error inesperado verificando el borrado: ${error.message ?? error.name ?? "desconocido"}`);
      }
    }

    console.log("\n🎉 TODAS LAS PRUEBAS E2E (CRUD R2, URLs Firmadas) FUERON EXITOSAS.");
  } catch (error) {
    console.error("\n❌ Error en las pruebas de R2:", error);
    process.exit(1);
  } finally {
    if (uploaded) {
      await deletePrivateObject(testKey).catch(() => undefined);
    }
  }
}

runR2Tests();
