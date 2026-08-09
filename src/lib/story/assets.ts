import "server-only"

import { getAssets } from "@/lib/assets/queries"
import type { StoryAssetOption } from "./contracts"

export async function getStoryAssets(): Promise<{ assets: StoryAssetOption[]; error: string | null }> {
  try {
    const result = await getAssets({}, undefined, 50)
    return { assets: result.assets.map((asset) => { const metadata = asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? asset.metadata as Record<string, unknown> : {}; return { id: asset.id, name: asset.name, type: asset.type as StoryAssetOption["type"], signedUrl: asset.signedUrl, category: typeof metadata.category === "string" ? metadata.category : undefined } }), error: null }
  } catch { return { assets: [], error: "No se pudo cargar la biblioteca de assets en este entorno." } }
}
