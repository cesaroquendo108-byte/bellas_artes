import { randomUUID } from "node:crypto";
import { deletePrivateObject, getPrivateObjectUrl, uploadPrivateObject } from "@/lib/storage/r2";
import { createAdminClient } from "@/utils/supabase/admin";

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 90) || "archivo";
}

export async function persistGenerationInput(input: { userId: string; file: File; type: "image" | "video" | "audio"; source: string }) {
  const key = `users/${input.userId}/inputs/${input.type}/${randomUUID()}-${safeName(input.file.name)}`;
  const admin = createAdminClient();
  let assetId: string | null = null;
  try {
    await uploadPrivateObject({ key, body: new Uint8Array(await input.file.arrayBuffer()), contentType: input.file.type, metadata: { owner: input.userId, source: input.source } });
    const { data, error } = await admin.from("assets").insert({
      user_id: input.userId,
      type: input.type,
      name: input.file.name.slice(0, 160),
      r2_key: key,
      mime_type: input.file.type,
      bytes: input.file.size,
      metadata: { source: input.source },
    }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "No se pudo registrar el archivo.");
    assetId = data.id as string;
    return { id: assetId, key, signedUrl: await getPrivateObjectUrl(key) };
  } catch (error) {
    if (assetId) {
      try {
        await admin.from("assets").delete().eq("id", assetId).eq("user_id", input.userId);
      } catch {
        // El objeto privado se intenta borrar aunque la limpieza de la fila falle.
      }
    }
    await deletePrivateObject(key).catch(() => undefined);
    throw error;
  }
}

export async function cleanupGenerationInput(input: { userId: string; assetId: string; key: string }) {
  const admin = createAdminClient();
  const { data: links, error: linksError } = await admin
    .from("generation_job_assets")
    .select("job_id")
    .eq("asset_id", input.assetId)
    .limit(1);
  // If the lookup fails, preserve the asset. A linked job must never lose its input
  // because a best-effort cleanup ran during an error path.
  if (linksError || (links?.length ?? 0) > 0) return;

  const { error: deleteError } = await admin
    .from("assets")
    .delete()
    .eq("id", input.assetId)
    .eq("user_id", input.userId);
  if (deleteError) return;
  await deletePrivateObject(input.key).catch(() => undefined);
}
