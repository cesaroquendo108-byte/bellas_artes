import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { deletePrivateObject } from "@/lib/storage/r2";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function cleanupExpiredAssets(limit = DEFAULT_LIMIT) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("assets")
    .select("id,r2_key")
    .not("expires_at", "is", null)
    .lt("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(safeLimit);

  if (error) throw new Error(`No se pudieron consultar los assets vencidos: ${error.message}`);

  const failures: Array<{ id: string; reason: string }> = [];
  let deleted = 0;

  for (const asset of data ?? []) {
    try {
      await deletePrivateObject(asset.r2_key);
      const { error: deleteError } = await admin
        .from("assets")
        .delete()
        .eq("id", asset.id)
        .lt("expires_at", now);

      if (deleteError) throw deleteError;
      deleted += 1;
    } catch (error) {
      failures.push({
        id: asset.id,
        reason: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  return { scanned: data?.length ?? 0, deleted, failures };
}
