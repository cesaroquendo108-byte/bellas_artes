import { NextResponse } from "next/server";
import {
  BUILTIN_PRESETS,
  getBuiltinEntries,
  getEntriesByCategory,
  searchEntries,
} from "@/lib/prompt-composer/library";
import type { PromptCategory } from "@/lib/prompt-composer/types";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") as PromptCategory | null;
    const search = url.searchParams.get("search");

    let entries = getBuiltinEntries();

    if (search) {
      entries = searchEntries(search, category || undefined);
    } else if (category) {
      entries = getEntriesByCategory(category);
    }

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries,
      presets: BUILTIN_PRESETS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sectionCount: p.sections.length,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener la biblioteca de prompts";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
