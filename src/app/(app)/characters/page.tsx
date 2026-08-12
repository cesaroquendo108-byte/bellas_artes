import type { Metadata } from "next"

import { CharactersHub } from "@/components/characters-worlds"
import { getCharacterWorldLibrary } from "@/lib/assets/character-worlds"

export const metadata: Metadata = { title: "Personajes · Bellas Artes", description: "Biblioteca y estudio de personajes consistentes." }

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [{ view }, library] = await Promise.all([searchParams, getCharacterWorldLibrary()])
  return <CharactersHub assets={library.assets} libraryError={library.error} initialView={view === "community" ? "community" : "mine"} />
}
