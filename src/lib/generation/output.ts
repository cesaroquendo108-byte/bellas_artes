import "server-only";

import { createHash } from "node:crypto";
import { uploadPrivateObject } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";
import type { ProviderResult } from "./providers/types";
import { createProvenanceEnvelope } from "./provenance";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm", "audio/ogg"]);

function extension(contentType: string) {
  return contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]?.replace("mpeg", "mp3") ?? "bin";
}

export async function persistGenerationOutput(input: {
  userId: string;
  jobId: string;
  kind: "image" | "video" | "audio" | "character" | "world";
  result: ProviderResult;
}) {
  if (!allowedTypes.has(input.result.contentType)) throw new Error(`Tipo de salida no permitido: ${input.result.contentType}`);
  if (!input.result.bytes.byteLength || input.result.bytes.byteLength > 250 * 1024 * 1024) throw new Error("El resultado excede el límite permitido.");
  const digest = createHash("sha256").update(input.result.bytes).digest("hex");
  const provenance = createProvenanceEnvelope({
    userId: input.userId,
    jobId: input.jobId,
    sha256: digest,
    contentType: input.result.contentType,
  });
  const type = input.kind === "character" || input.kind === "world" ? "image" : input.kind;
  const key = `users/${input.userId}/generated/${type}/${input.jobId}-${digest.slice(0, 16)}.${extension(input.result.contentType)}`;
  await uploadPrivateObject({
    key,
    body: input.result.bytes,
    contentType: input.result.contentType,
    metadata: {
      owner: input.userId,
      generationJobId: input.jobId,
      sha256: digest,
      provenance: "bellas-artes-ai-generation",
      provenanceVersion: provenance?.version ?? "unsigned",
      provenanceSignature: provenance?.signature ?? "unsigned",
    },
  });
  const { data, error } = await createAdminClient().from("assets").insert({
    user_id: input.userId,
    type,
    name: input.result.filename.slice(0, 160) || `${type}-${input.jobId}`,
    r2_key: key,
    mime_type: input.result.contentType,
    bytes: input.result.bytes.byteLength,
    metadata: {
      source: "generation",
      provenance: provenance ?? { version: "unsigned" },
      watermark: provenance ? "signed-provenance" : "metadata-only",
      generationJobId: input.jobId,
      sha256: digest,
      backend: input.result.metadata ?? {},
    },
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo registrar el resultado.");
  return data.id as string;
}
