import type {
  ActiveEntrySelection,
  ComposedPromptResult,
  ComposeOptions,
  PromptEntry,
  PromptSection,
  ComfyPromptComposerState,
} from "./types";
import { MASTER_NEGATIVE_PROMPT, getPresetById } from "./library";

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Given a 32-bit integer seed, produces a deterministic stream of uniform floats in [0, 1).
 */
export function createPrng(seed: number): () => number {
  let s = Math.floor(Math.abs(seed)) >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatEntryText(entry: PromptEntry): string {
  const text = entry.text.trim();
  if (!text) return "";
  if (entry.weight !== undefined && entry.weight !== 1.0 && Number.isFinite(entry.weight)) {
    return `(${text}:${entry.weight.toFixed(2)})`;
  }
  return text;
}

export function cleanPromptWhitespace(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/,\s*,+/g, ",")
    .replace(/\.\s*\.+/g, ".")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .trim()
    .replace(/,\s*$/, "");
}

/**
 * Composes a full positive and negative prompt from a list of sections.
 */
export function composePrompt(
  sections: PromptSection[],
  options: ComposeOptions = {},
): ComposedPromptResult {
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const prng = createPrng(seed);
  const activeEntries: ActiveEntrySelection[] = [];

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const positiveBlocks: string[] = [];
  const negativeFragments: string[] = [];

  // Base prompt injection
  if (options.basePrompt && options.basePrompt.trim()) {
    positiveBlocks.push(options.basePrompt.trim());
  }

  for (const section of sortedSections) {
    if (!section.enabled) continue;

    // Handle locked prompt sections
    if (section.isLockedPrompt) {
      continue;
    }

    if (!section.entries || section.entries.length === 0) continue;

    // If section category is negative, route to negative prompt
    if (section.category === "negative") {
      for (const entry of section.entries) {
        const text = entry.text.trim();
        if (text) {
          negativeFragments.push(text);
          activeEntries.push({
            sectionId: section.id,
            sectionName: section.name,
            category: section.category,
            entryId: entry.id,
            entryName: entry.name,
            entryText: text,
            weight: entry.weight,
          });
        }
      }
      continue;
    }

    // Determine which entries to include
    let selectedEntries: PromptEntry[] = [];
    if (section.randomize) {
      // Pick exactly one entry deterministically using prng
      const index = Math.floor(prng() * section.entries.length);
      const chosen = section.entries[index];
      if (chosen) selectedEntries = [chosen];
    } else {
      selectedEntries = section.entries;
    }

    if (selectedEntries.length === 0) continue;

    const entryStrings: string[] = [];
    for (let i = 0; i < selectedEntries.length; i++) {
      const entry = selectedEntries[i];
      const formatted = formatEntryText(entry);
      if (!formatted) continue;

      activeEntries.push({
        sectionId: section.id,
        sectionName: section.name,
        category: section.category,
        entryId: entry.id,
        entryName: entry.name,
        entryText: formatted,
        weight: entry.weight,
      });

      // Entry separator (none | comma | and)
      if (i < selectedEntries.length - 1) {
        if (entry.separator === "and") {
          entryStrings.push(`${formatted} and`);
        } else if (entry.separator === "none") {
          entryStrings.push(formatted);
        } else {
          entryStrings.push(`${formatted},`);
        }
      } else {
        entryStrings.push(formatted);
      }
    }

    if (entryStrings.length === 0) continue;

    let sectionContent = entryStrings.join(" ");

    // Section label
    if (section.showLabel || options.includeLabels) {
      sectionContent = `${section.name}: ${sectionContent}`;
    }

    // End separator (comma | period | none)
    if (section.endSeparator === "period") {
      sectionContent = sectionContent.replace(/[,\s]+$/, "") + ".";
    } else if (section.endSeparator === "comma") {
      sectionContent = sectionContent.replace(/[,\s]+$/, "") + ",";
    }

    positiveBlocks.push(sectionContent);
  }

  let finalPositive = positiveBlocks.join(" ");
  if (options.cleanWhitespace !== false) {
    finalPositive = cleanPromptWhitespace(finalPositive);
  }

  // Assemble negative prompt
  const negParts: string[] = [];
  if (options.negativePrompt) {
    negParts.push(options.negativePrompt.trim());
  } else {
    negParts.push(MASTER_NEGATIVE_PROMPT);
  }

  for (const neg of negativeFragments) {
    if (!negParts.includes(neg)) {
      negParts.push(neg);
    }
  }

  let finalNegative = negParts.join(", ");
  if (options.cleanWhitespace !== false) {
    finalNegative = cleanPromptWhitespace(finalNegative);
  }

  const wordCount = finalPositive ? finalPositive.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = finalPositive.length;

  return {
    positive: finalPositive,
    negative: finalNegative,
    seedUsed: seed,
    activeEntries,
    metadata: {
      sectionCount: sections.length,
      activeSectionCount: sections.filter((s) => s.enabled).length,
      wordCount,
      characterCount,
    },
  };
}

/**
 * Convenience method to compose directly from a registered preset ID.
 */
export function composeFromPreset(
  presetId: string,
  options: ComposeOptions = {},
): ComposedPromptResult {
  const preset = getPresetById(presetId);
  if (!preset) {
    throw new Error(`El preset de Prompt Composer "${presetId}" no fue encontrado.`);
  }

  const mergedOptions: ComposeOptions = {
    basePrompt: options.basePrompt ?? preset.lockedPrompt,
    negativePrompt: options.negativePrompt ?? preset.negativePrompt,
    ...options,
  };

  return composePrompt(preset.sections, mergedOptions);
}

/**
 * Builds the exact parameters required by the ComfyUI PromptComposer custom node.
 */
export function buildComfyPromptComposerNodeInput(
  sections: PromptSection[],
  userPrompt = "",
  seed = 0,
): ComfyPromptComposerState {
  const serializedState = JSON.stringify(
    sections.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color || "#3b82f6",
      enabled: s.enabled,
      randomize: s.randomize,
      end_separator: s.endSeparator,
      show_label: s.showLabel,
      order: s.order,
      is_locked_prompt: Boolean(s.isLockedPrompt),
      entries: s.entries.map((e) => ({
        id: e.id,
        prompt_ref: e.name,
        visible: true,
        allow_random: true,
        entry_separator: e.separator || "comma",
      })),
    })),
  );

  return {
    composer_state: serializedState,
    user_prompt: userPrompt,
    seed,
  };
}
