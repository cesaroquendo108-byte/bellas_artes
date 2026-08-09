import "server-only"

import { mapCharacterWorldAsset } from "@/components/characters-worlds/asset-mapper"
import type { CharacterWorldAsset } from "@/components/characters-worlds/types"
import { getAssets } from "@/lib/assets/queries"

export async function getCharacterWorldLibrary(): Promise<{ assets: CharacterWorldAsset[]; error: string | null }> {
  try {
    const result = await getAssets({}, undefined, 50)
    return { assets: result.assets.map(mapCharacterWorldAsset), error: null }
  } catch {
    return { assets: [], error: "No se pudo cargar la biblioteca privada. Los estudios locales siguen disponibles." }
  }
}
