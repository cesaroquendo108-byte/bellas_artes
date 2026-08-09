import type { Metadata } from "next"

import { VideoHub } from "@/components/video-hub"

export const metadata: Metadata = {
  title: "Video Suite · Bellas Artes",
  description: "Crea, transforma y mejora video con estudios especializados de IA.",
}

export default function VideoHubPage() {
  return <div className="-m-4 sm:-m-6 lg:-m-8"><VideoHub /></div>
}
