export type PromptCategory =
  | "subject"
  | "apparel"
  | "environment"
  | "lighting"
  | "camera"
  | "style"
  | "negative"
  | "custom";

export type EntrySeparator = "none" | "comma" | "and";
export type EndSeparator = "comma" | "period" | "none";

export interface PromptEntry {
  id: string;
  name: string;
  category: PromptCategory;
  text: string;
  weight?: number;
  tags?: string[];
  isFavorite?: boolean;
  separator?: EntrySeparator;
}

export interface PromptSection {
  id: string;
  name: string;
  category: PromptCategory;
  color?: string;
  enabled: boolean;
  randomize: boolean;
  endSeparator: EndSeparator;
  showLabel: boolean;
  order: number;
  entries: PromptEntry[];
  isLockedPrompt?: boolean;
}

export interface PromptComposerPreset {
  id: string;
  name: string;
  description: string;
  lockedPrompt?: string;
  negativePrompt?: string;
  sections: PromptSection[];
}

export interface ComposeOptions {
  seed?: number;
  includeLabels?: boolean;
  basePrompt?: string;
  negativePrompt?: string;
  cleanWhitespace?: boolean;
}

export interface ActiveEntrySelection {
  sectionId: string;
  sectionName: string;
  category: PromptCategory;
  entryId: string;
  entryName: string;
  entryText: string;
  weight?: number;
}

export interface ComposedPromptResult {
  positive: string;
  negative: string;
  seedUsed: number;
  activeEntries: ActiveEntrySelection[];
  metadata: {
    sectionCount: number;
    activeSectionCount: number;
    wordCount: number;
    characterCount: number;
  };
}

export interface ComfyPromptComposerState {
  composer_state: string; // JSON serialized list of sections
  user_prompt: string;
  seed: number;
}
