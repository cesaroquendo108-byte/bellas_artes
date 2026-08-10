import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  throw new Error("Faltan credenciales R2 en el entorno.");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function run() {
  try {
    const data = await client.send(new ListBucketsCommand({}));
    console.log(`R2 accesible. Buckets visibles: ${data.Buckets?.length ?? 0}`);
  } catch (err: unknown) {
    console.error("Error listing buckets:", err);
    process.exitCode = 1;
  }
}

void run();
