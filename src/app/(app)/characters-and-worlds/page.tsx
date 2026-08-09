import type { Metadata } from "next"

import { CharactersAndWorldsHub, type UnifiedCategory } from "@/components/characters-worlds"
import { getCharacterWorldLibrary } from "@/lib/assets/character-worlds"

export const metadata: Metadata = { title: "Characters & Worlds · Bellas Artes", description: "Repositorio unificado de recursos visuales." }
const categories = new Set<UnifiedCategory>(["all", "characters", "worlds", "objects", "backgrounds", "styles"])

export default async function CharactersWorldsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, library] = await Promise.all([searchParams, getCharacterWorldLibrary()])
  const initialCategory = categories.has(category as UnifiedCategory) ? category as UnifiedCategory : "all"
  return <div className="-m-4 sm:-m-6 lg:-m-8"><CharactersAndWorldsHub assets={library.assets} libraryError={library.error} initialCategory={initialCategory} /></div>
}
