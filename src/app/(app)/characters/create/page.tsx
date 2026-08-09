import type { Metadata } from "next"

import { CharacterBuilder } from "@/components/characters-worlds"
import { getCharacterWorldLibrary } from "@/lib/assets/character-worlds"

export const metadata: Metadata = { title: "Character Builder · Bellas Artes", description: "Construye identidades visuales consistentes." }

export default async function CharacterCreatePage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const [{ reference }, library] = await Promise.all([searchParams, getCharacterWorldLibrary()])
  return <div className="-m-4 min-w-0 sm:-m-6 lg:-m-8"><CharacterBuilder assets={library.assets} initialReferenceId={reference} /></div>
}
