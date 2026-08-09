import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Env } from "@/lib/env";

let client: S3Client | null = null;

export function _resetR2ClientForTesting() {
  client = null;
}

function getClient() {
  if (client) return client;
  const env = getR2Env();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
  return client;
}

export async function uploadPrivateObject(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
}) {
  const { bucket } = getR2Env();
  await getClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    Metadata: input.metadata,
  }));
  return input.key;
}

export async function getPrivateObjectUrl(key: string, expiresIn = 900) {
  const { bucket } = getR2Env();
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

export async function deletePrivateObject(key: string) {
  const { bucket } = getR2Env();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
