import { randomUUID } from "node:crypto";
import { deletePrivateObject, getPrivateObjectUrl, uploadPrivateObject } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 90) || "archivo";
}

export async function persistGenerationInput(input: { userId: string; file: File; type: "image" | "video" | "audio"; source: string }) {
  const key = `users/${input.userId}/inputs/${input.type}/${randomUUID()}-${safeName(input.file.name)}`;
  try {
    await uploadPrivateObject({ key, body: new Uint8Array(await input.file.arrayBuffer()), contentType: input.file.type, metadata: { owner: input.userId, source: input.source } });
    const { data, error } = await createAdminClient().from("assets").insert({
      user_id: input.userId,
      type: input.type,
      name: input.file.name.slice(0, 160),
      r2_key: key,
      mime_type: input.file.type,
      bytes: input.file.size,
      metadata: { source: input.source },
    }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "No se pudo registrar el archivo.");
    return { id: data.id as string, signedUrl: await getPrivateObjectUrl(key) };
  } catch (error) {
    await deletePrivateObject(key).catch(() => undefined);
    throw error;
  }
}
