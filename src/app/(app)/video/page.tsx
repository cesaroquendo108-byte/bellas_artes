import type { Metadata } from "next"

import { VideoHub } from "@/components/video-hub"

export const metadata: Metadata = {
  title: "Suite de video · Bellas Artes",
  description: "Crea, transforma y mejora video con estudios especializados de IA.",
}

export default function VideoHubPage() {
  return <VideoHub />
}
