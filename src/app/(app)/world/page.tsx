import type { Metadata } from "next"

import { WorldHub } from "@/components/characters-worlds"
import { getCharacterWorldLibrary } from "@/lib/assets/character-worlds"

export const metadata: Metadata = { title: "Mundos · Bellas Artes", description: "Biblioteca y constructor de entornos visuales." }

export default async function WorldPage({ searchParams }: { searchParams: Promise<{ mode?: string; prompt?: string }> }) {
  const [{ mode, prompt }, library] = await Promise.all([searchParams, getCharacterWorldLibrary()])
  return <WorldHub assets={library.assets} libraryError={library.error} createOpen={mode === "create" || Boolean(prompt)} initialPrompt={typeof prompt === "string" ? prompt : ""} />
}
