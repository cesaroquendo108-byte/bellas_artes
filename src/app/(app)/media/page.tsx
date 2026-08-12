import type { Metadata } from "next"

import { MediaHub, type MediaHubAsset } from "@/components/media-hub"
import { getAssets } from "@/lib/assets/queries"

export const metadata: Metadata = {
  title: "Centro de medios · Bellas Artes",
  description: "Herramientas de video y biblioteca privada de medios.",
}

export default async function MediaPage() {
  let assets: MediaHubAsset[] = []
  let libraryError: string | null = null
  try {
    const result = await getAssets({}, undefined, 50)
    assets = result.assets.map((asset) => {
      const metadata = asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? asset.metadata : {}
      const labels = "labels" in metadata && Array.isArray(metadata.labels) ? metadata.labels.filter((label: unknown): label is string => typeof label === "string") : []
      const folderId = "folderId" in metadata && typeof metadata.folderId === "string" ? metadata.folderId : null
      return { id: asset.id, type: asset.type, name: asset.name, signedUrl: asset.signedUrl, createdAt: asset.created_at, labels, folderId }
    })
  } catch {
    libraryError = "No se pudo cargar la biblioteca privada. Las herramientas siguen disponibles."
  }
  return <MediaHub initialAssets={assets} libraryError={libraryError} />
}
