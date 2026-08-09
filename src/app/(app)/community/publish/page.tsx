import type { Metadata } from "next"

import { PublishCommunityForm, type PublishableAsset } from "@/components/social/publish-community-form"
import { getAssets } from "@/lib/assets/queries"

export const metadata: Metadata = {
  title: "Publicar en Inspiración · Bellas Artes",
  robots: { index: false, follow: false },
}

export default async function PublishCommunityPage() {
  let assets: PublishableAsset[] = []
  let error: string | null = null

  try {
    const result = await getAssets({}, undefined, 50)
    assets = result.assets
      .filter((asset) => asset.type === "image" || asset.type === "video")
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type as "image" | "video",
        signedUrl: asset.signedUrl,
      }))
  } catch {
    error = "No fue posible consultar la biblioteca privada en este entorno."
  }

  return (
    <div className="min-h-screen text-white">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Comunidad de inspiración</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Comparte una creación</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Selecciona un asset propio. Toda publicación entra en revisión y nunca consume créditos.</p>
      </header>
      {error && <p className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs text-amber-200">{error}</p>}
      <PublishCommunityForm assets={assets} />
    </div>
  )
}
