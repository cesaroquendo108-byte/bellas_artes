import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucket = process.env.CLOUDFLARE_R2_SANDBOX_BUCKET;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error("Faltan credenciales R2 o CLOUDFLARE_R2_SANDBOX_BUCKET en el entorno.");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function run() {
  try {
    console.log(`Probando crear el bucket ${bucket}...`);
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log("Bucket creado exitosamente.");
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string };
    if (error.name === "BucketAlreadyExists" || error.name === "BucketAlreadyOwnedByYou") {
      console.log(`El bucket '${bucket}' ya existe.`);
    } else {
      console.error("Error al crear:", error.message ?? error);
      process.exitCode = 1;
    }
  }
}

void run();
