import type { Metadata } from "next"

import { ImageStudio, type ImageGalleryAsset } from "@/components/image-studio"
import { getAssets } from "@/lib/assets/queries"
import { getBrandKitsForPage } from "@/lib/brand-kits/queries"

export const metadata: Metadata = {
  title: "Estudio de imágenes · Bellas Artes",
  description: "Estudio privado para crear y reinventar imágenes con IA.",
}

export default async function ImageStudioPage() {
  let initialAssets: ImageGalleryAsset[] = []
  let galleryError: string | null = null

  const brandKitResult = await getBrandKitsForPage()

  try {
    const result = await getAssets({ type: "image" }, undefined, 24)
    initialAssets = result.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      signedUrl: asset.signedUrl,
      createdAt: asset.created_at,
    }))
  } catch {
    galleryError = "Configura el almacenamiento privado para consultar tus imágenes. El estudio puede seguir utilizándose."
  }

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <ImageStudio
        initialAssets={initialAssets}
        galleryError={galleryError}
        brandKits={brandKitResult.kits.map((kit) => ({
          id: kit.id,
          name: kit.name,
          guidelines: kit.guidelines,
          negativePrompt: kit.negativePrompt,
          assets: kit.assets.map((asset) => ({
            assetId: asset.assetId,
            name: asset.name,
            signedUrl: asset.signedUrl,
          })),
        }))}
      />
    </div>
  )
}
