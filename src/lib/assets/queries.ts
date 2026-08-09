import "server-only";

import { requireUser } from "@/lib/auth";
import {
  buildSeekFilter,
  decodeSeekCursor,
  encodeSeekCursor,
} from "@/lib/pagination/cursor";
import { getPrivateObjectUrl } from "@/lib/storage/r2";
import type { AssetType } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export async function getAssets(
  filters: { type?: AssetType } = {},
  cursor?: string,
  limit = 24,
) {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  let query = supabase
    .from("assets")
    .select("id,type,name,r2_key,mime_type,bytes,metadata,expires_at,created_at")
    .eq("user_id", profile.id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);

  if (filters.type) query = query.eq("type", filters.type);
  const seekCursor = decodeSeekCursor(cursor);
  if (seekCursor) query = query.or(buildSeekFilter(seekCursor));
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron consultar los assets: ${error.message}`);

  const hasMore = (data?.length ?? 0) > safeLimit;
  const rows = (data ?? []).slice(0, safeLimit);
  const assets = await Promise.all(rows.map(async (asset) => ({
    ...asset,
    signedUrl: await getPrivateObjectUrl(asset.r2_key),
  })));

  return {
    assets,
    nextCursor: hasMore && rows.at(-1)
      ? encodeSeekCursor({
          createdAt: rows.at(-1)!.created_at,
          id: rows.at(-1)!.id,
        })
      : null,
  };
}
