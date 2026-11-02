import { describe, expect, it } from "vitest";
import {
  composePrompt,
  composeFromPreset,
  buildComfyPromptComposerNodeInput,
  cleanPromptWhitespace,
  formatEntryText,
  createPrng,
} from "./composer";
import {
  BUILTIN_ENTRIES,
  BUILTIN_PRESETS,
  MASTER_NEGATIVE_PROMPT,
  getEntriesByCategory,
  searchEntries,
} from "./library";
import type { PromptEntry, PromptSection } from "./types";

describe("Prompt Composer Engine", () => {
  it("formats entry text with weight modifier", () => {
    const plain: PromptEntry = {
      id: "1",
      name: "Test",
      category: "subject",
      text: "cinematic warrior",
    };
    expect(formatEntryText(plain)).toBe("cinematic warrior");

    const weighted: PromptEntry = {
      id: "2",
      name: "Test Weighted",
      category: "subject",
      text: "cinematic warrior",
      weight: 1.35,
    };
    expect(formatEntryText(weighted)).toBe("(cinematic warrior:1.35)");
  });

  it("cleans excessive whitespace and punctuation", () => {
    const raw = "hello ,  world .   foo  , , bar . ";
    expect(cleanPromptWhitespace(raw)).toBe("hello, world. foo, bar.");
  });

  it("deterministic PRNG produces identical sequence for same seed", () => {
    const prng1 = createPrng(12345);
    const prng2 = createPrng(12345);
    const seq1 = [prng1(), prng1(), prng1()];
    const seq2 = [prng2(), prng2(), prng2()];
    expect(seq1).toEqual(seq2);
  });

  it("composes prompt respecting section ordering and separators", () => {
    const sections: PromptSection[] = [
      {
        id: "s2",
        name: "Lighting",
        category: "lighting",
        enabled: true,
        randomize: false,
        endSeparator: "period",
        showLabel: false,
        order: 2,
        entries: [
          {
            id: "e2",
            name: "Warm Light",
            category: "lighting",
            text: "warm sunset rim light",
          },
        ],
      },
      {
        id: "s1",
        name: "Subject",
        category: "subject",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 1,
        entries: [
          {
            id: "e1",
            name: "Man",
            category: "subject",
            text: "handsome analyst",
          },
        ],
      },
    ];

    const result = composePrompt(sections, { seed: 42 });
    expect(result.positive).toBe("handsome analyst, warm sunset rim light.");
    expect(result.activeEntries).toHaveLength(2);
    expect(result.activeEntries[0].entryText).toBe("handsome analyst");
    expect(result.activeEntries[1].entryText).toBe("warm sunset rim light");
    expect(result.seedUsed).toBe(42);
  });

  it("handles randomized sections deterministically", () => {
    const randomSection: PromptSection = {
      id: "rnd",
      name: "Styles",
      category: "style",
      enabled: true,
      randomize: true,
      endSeparator: "none",
      showLabel: false,
      order: 1,
      entries: [
        { id: "e1", name: "Kodak", category: "style", text: "kodak film" },
        { id: "e2", name: "Digital", category: "style", text: "clean digital" },
        { id: "e3", name: "Vintage", category: "style", text: "vintage polaroid" },
      ],
    };

    const res1 = composePrompt([randomSection], { seed: 999 });
    const res2 = composePrompt([randomSection], { seed: 999 });
    expect(res1.positive).toBe(res2.positive);
    expect(res1.activeEntries).toHaveLength(1);
  });

  it("skips disabled sections", () => {
    const sections: PromptSection[] = [
      {
        id: "s1",
        name: "Subject",
        category: "subject",
        enabled: false,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 1,
        entries: [{ id: "e1", name: "Hero", category: "subject", text: "superhero" }],
      },
      {
        id: "s2",
        name: "Environment",
        category: "environment",
        enabled: true,
        randomize: false,
        endSeparator: "none",
        showLabel: false,
        order: 2,
        entries: [{ id: "e2", name: "City", category: "environment", text: "cyberpunk city" }],
      },
    ];

    const res = composePrompt(sections);
    expect(res.positive).toBe("cyberpunk city");
    expect(res.activeEntries).toHaveLength(1);
    expect(res.metadata.activeSectionCount).toBe(1);
  });

  it("routes negative entries to negative prompt output", () => {
    const sections: PromptSection[] = [
      {
        id: "pos",
        name: "Subject",
        category: "subject",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 1,
        entries: [{ id: "p1", name: "Man", category: "subject", text: "businessman" }],
      },
      {
        id: "neg",
        name: "Negative Additions",
        category: "negative",
        enabled: true,
        randomize: false,
        endSeparator: "none",
        showLabel: false,
        order: 2,
        entries: [{ id: "n1", name: "No Hat", category: "negative", text: "wearing hat" }],
      },
    ];

    const res = composePrompt(sections, { negativePrompt: "bad quality" });
    expect(res.positive).toBe("businessman");
    expect(res.negative).toContain("bad quality");
    expect(res.negative).toContain("wearing hat");
  });

  it("composes from built-in presets successfully", () => {
    const anchorRes = composeFromPreset("preset_fiduciary_anchor", { seed: 100 });
    expect(anchorRes.positive).toContain("financial analyst");
    expect(anchorRes.positive).toContain("Savile Row");
    expect(anchorRes.positive).toContain("Bloomberg");
    expect(anchorRes.negative).toContain("deformed");

    const recastRes = composeFromPreset("preset_cinematic_scail_recast", { seed: 200 });
    expect(recastRes.positive).toContain("police officer");
    expect(recastRes.positive).toContain("locker room");
    expect(recastRes.positive).toContain("Cooke Anamorphic");
  });

  it("throws error when preset does not exist", () => {
    expect(() => composeFromPreset("non_existent_preset")).toThrowError(/no fue encontrado/);
  });

  it("builds valid ComfyUI node input structure", () => {
    const preset = BUILTIN_PRESETS[0];
    const nodeInput = buildComfyPromptComposerNodeInput(
      preset.sections,
      "master financial overview",
      12345,
    );

    expect(nodeInput.user_prompt).toBe("master financial overview");
    expect(nodeInput.seed).toBe(12345);

    const parsedState = JSON.parse(nodeInput.composer_state);
    expect(Array.isArray(parsedState)).toBe(true);
    expect(parsedState.length).toBe(preset.sections.length);
    expect(parsedState[0].name).toBe("Subject");
    expect(parsedState[0].entries[0].prompt_ref).toBe(preset.sections[0].entries[0].name);
  });

  it("searches and filters library entries correctly", () => {
    const subjects = getEntriesByCategory("subject");
    expect(subjects.length).toBeGreaterThan(0);
    expect(subjects.every((e) => e.category === "subject")).toBe(true);

    const tactical = searchEntries("tactical");
    expect(tactical.length).toBeGreaterThan(0);
    expect(tactical.some((e) => e.name.includes("Tactical"))).toBe(true);
  });
});
