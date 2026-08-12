import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { isVideoOperation, VideoStudioShell, VIDEO_TOOL_META, type StudioAsset } from "@/components/video-studio"
import { getAssets } from "@/lib/assets/queries"

interface PageProps {
  params: Promise<{ tool: string }>
  searchParams: Promise<{ prompt?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tool } = await params
  if (!isVideoOperation(tool)) return {}
  return { title: `${VIDEO_TOOL_META[tool].title} · Bellas Artes`, description: VIDEO_TOOL_META[tool].description }
}

export default async function VideoToolPage({ params, searchParams }: PageProps) {
  const [{ tool }, { prompt }] = await Promise.all([params, searchParams])
  if (!isVideoOperation(tool)) notFound()

  let assets: StudioAsset[] = []
  let assetsUnavailable = false
  try {
    const result = await getAssets({}, undefined, 50)
    assets = result.assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      signedUrl: asset.signedUrl,
      createdAt: asset.created_at,
      mimeType: asset.mime_type,
    }))
  } catch {
    assetsUnavailable = true
  }

  return <div className="min-w-0"><VideoStudioShell operation={tool} assets={assets} assetsUnavailable={assetsUnavailable} initialPrompt={typeof prompt === "string" ? prompt : ""} /></div>
}
