import type {
  PromptCategory,
  PromptEntry,
  PromptComposerPreset,
  PromptSection,
} from "./types";

export const BUILTIN_ENTRIES: PromptEntry[] = [
  // Subject
  {
    id: "sub_fin_anchor",
    name: "Finance Anchor / Portfolio Manager",
    category: "subject",
    text: "charismatic 38-year-old financial analyst, composed and authoritative posture, looking into the lens with quiet confidence",
    tags: ["finance", "corporate", "portrait"],
  },
  {
    id: "sub_tactical_officer",
    name: "Tactical Police Officer",
    category: "subject",
    text: "athletic Hispanic police officer, determined expression, sharp tactical focus",
    tags: ["police", "action", "cinematic"],
  },
  {
    id: "sub_investigative_reporter",
    name: "Investigative Journalist",
    category: "subject",
    text: "serious investigative reporter reviewing case files, intense and observant eyes",
    tags: ["editorial", "journalism", "drama"],
  },
  {
    id: "sub_tech_founder",
    name: "Tech Founder / Executive",
    category: "subject",
    text: "modern fintech innovator, relaxed yet sharp posture, engaging presence",
    tags: ["tech", "startup", "portrait"],
  },

  // Apparel
  {
    id: "app_bespoke_suit",
    name: "Bespoke Navy Wool Suit",
    category: "apparel",
    text: "tailored navy wool suit by Savile Row, crisp white poplin shirt, subtle matte silk tie, silver cufflinks",
    tags: ["formal", "luxury", "finance"],
  },
  {
    id: "app_tactical_uniform",
    name: "Tactical Police Uniform",
    category: "apparel",
    text: "dark navy LAPD patrol uniform, tactical ballistic vest with badge, utility duty belt, clean collar insignia",
    tags: ["tactical", "police", "uniform"],
  },
  {
    id: "app_urban_streetwear",
    name: "Editorial Urban Streetwear",
    category: "apparel",
    text: "oversized heavy-cotton ivory t-shirt, relaxed charcoal pleated trousers, minimalist leather sneakers",
    tags: ["streetwear", "modern", "casual"],
  },
  {
    id: "app_cashmere_knitwear",
    name: "Minimalist Cashmere Knitwear",
    category: "apparel",
    text: "slate grey premium cashmere crewneck sweater, tailored charcoal chinos",
    tags: ["minimalist", "luxury", "editorial"],
  },

  // Environment
  {
    id: "env_trading_floor",
    name: "Wall Street Trading Floor",
    category: "environment",
    text: "bustling investment banking trading floor, glowing Bloomberg terminal monitors with financial charts in the soft-focus background",
    tags: ["finance", "office", "interior"],
  },
  {
    id: "env_police_locker_room",
    name: "Moody Police Locker Room",
    category: "environment",
    text: "dimly lit police precinct locker room, weathered metal lockers, wooden benches, subdued industrial atmosphere",
    tags: ["police", "cinematic", "interior"],
  },
  {
    id: "env_caracas_skyline",
    name: "Caracas Financial District Skyline",
    category: "environment",
    text: "modern high-rise executive office overlooking the Caracas skyline and El Avila mountain in the distance",
    tags: ["venezuela", "city", "corporate"],
  },
  {
    id: "env_brutalist_studio",
    name: "Brutalist Concrete Studio",
    category: "environment",
    text: "minimalist architectural space with smooth cast concrete walls, polished floor, and generous negative space",
    tags: ["architectural", "minimalist", "editorial"],
  },

  // Lighting
  {
    id: "lit_chiaroscuro_noir",
    name: "Cinematic Chiaroscuro Noir",
    category: "lighting",
    text: "dramatic low-key lighting, moody chiaroscuro contrast with deep natural shadows and subtle edge highlight",
    tags: ["moody", "noir", "dramatic"],
  },
  {
    id: "lit_golden_hour_rim",
    name: "Golden Hour Warm Rim",
    category: "lighting",
    text: "warm late afternoon sunbeam cutting through large floor-to-ceiling windows, subtle golden rim light outlining the silhouette",
    tags: ["golden hour", "warm", "cinematic"],
  },
  {
    id: "lit_cold_fluorescent",
    name: "Cold Institutional Fluorescent",
    category: "lighting",
    text: "clinical overhead fluorescent tubes diffused with a cool greenish-blue tint, gritty realism",
    tags: ["institutional", "realistic", "cold"],
  },
  {
    id: "lit_softbox_diffuse",
    name: "Commercial Softbox Diffuse",
    category: "lighting",
    text: "large octagonal softbox key light, soft wrap-around fill, clean neutral specular highlights on the eyes",
    tags: ["commercial", "clean", "studio"],
  },

  // Camera / Optics
  {
    id: "cam_cooke_35mm_anamorphic",
    name: "35mm Cooke Anamorphic",
    category: "camera",
    text: "shot on Arri Alexa Mini with Cooke Anamorphic/i 35mm lens, subtle oval bokeh, gentle focus falloff",
    tags: ["cinematic", "anamorphic", "35mm"],
  },
  {
    id: "cam_85mm_portrait_dof",
    name: "85mm f/1.4 Portrait Shallow DoF",
    category: "camera",
    text: "85mm f/1.4 prime lens, razor-sharp focus on the subject's eyes, creamy smooth background bokeh",
    tags: ["portrait", "shallow dof", "prime"],
  },
  {
    id: "cam_24mm_wide_dynamic",
    name: "24mm Wide Angle Dynamic",
    category: "camera",
    text: "24mm wide angle lens at chest height, slightly low angle emphasizing authority and environmental context",
    tags: ["wide", "dynamic", "low-angle"],
  },
  {
    id: "cam_handheld_documentary",
    name: "Handheld Documentary Drift",
    category: "camera",
    text: "subtle organic handheld camera motion, eye level, documentary realism",
    tags: ["documentary", "organic", "handheld"],
  },

  // Style
  {
    id: "sty_kodak_vision3_5219",
    name: "Kodak Vision3 500T 5219 Film",
    category: "style",
    text: "authentic 35mm motion picture film scan, fine organic grain, rich filmic color science, highlight roll-off",
    tags: ["film", "kodak", "analog"],
  },
  {
    id: "sty_hbo_prestige_thriller",
    name: "HBO Prestige Thriller Grade",
    category: "style",
    text: "prestige television cinematography, desaturated slate and teal color palette, deep rich blacks",
    tags: ["prestige", "hbo", "thriller"],
  },
  {
    id: "sty_editorial_nyt_press",
    name: "The New York Times Editorial",
    category: "style",
    text: "award-winning photojournalism style, unmanipulated skin textures, natural skin tones, sober reportage",
    tags: ["editorial", "journalism", "nyt"],
  },
  {
    id: "sty_hyper_clean_commercial",
    name: "Hyper-Clean Commercial",
    category: "style",
    text: "high-end commercial production value, crisp micro-contrast, vivid authentic colors, flawless master grade",
    tags: ["commercial", "crisp", "advertising"],
  },

  // Negative
  {
    id: "neg_standard_master",
    name: "Master Anti-Slop Negative",
    category: "negative",
    text: "deformed, distorted, disfigured, poorly drawn, bad anatomy, bad proportions, unnatural body, mutated limbs, extra arms, extra legs, malformed limbs, fused fingers, too many fingers, missing limbs, bad hands, low resolution, blurry, artifacts, watermark, logo, text, oversaturated, plastic skin, 3d render, cartoon, anime, artificial grid lines",
    tags: ["master", "negative", "anti-slop"],
  },
];

export const MASTER_NEGATIVE_PROMPT =
  "deformed, distorted, disfigured, poorly drawn, bad anatomy, bad proportions, unnatural body, mutated limbs, extra arms, extra legs, malformed limbs, fused fingers, too many fingers, missing limbs, bad hands, low resolution, blurry, artifacts, watermark, logo, text, oversaturated, plastic skin, 3d render, cartoon, anime, artificial grid lines, cyber mesh";

export const BUILTIN_PRESETS: PromptComposerPreset[] = [
  {
    id: "preset_fiduciary_anchor",
    name: "Fiduciary Investment Anchor",
    description:
      "Wall Street / Caracas fiduciary analyst presentation with authoritative styling and Bloomberg backdrop.",
    lockedPrompt: "close-up to medium shot of a high-conviction financial speaker",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    sections: [
      {
        id: "sec_subject",
        name: "Subject",
        category: "subject",
        color: "#2563eb",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 1,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "sub_fin_anchor")!],
      },
      {
        id: "sec_apparel",
        name: "Apparel",
        category: "apparel",
        color: "#4f46e5",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 2,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "app_bespoke_suit")!],
      },
      {
        id: "sec_environment",
        name: "Environment",
        category: "environment",
        color: "#059669",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 3,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "env_trading_floor")!],
      },
      {
        id: "sec_lighting",
        name: "Lighting",
        category: "lighting",
        color: "#d97706",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 4,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "lit_golden_hour_rim")!],
      },
      {
        id: "sec_camera",
        name: "Camera",
        category: "camera",
        color: "#dc2626",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 5,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "cam_85mm_portrait_dof")!],
      },
      {
        id: "sec_style",
        name: "Style",
        category: "style",
        color: "#7c3aed",
        enabled: true,
        randomize: false,
        endSeparator: "none",
        showLabel: false,
        order: 6,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "sty_editorial_nyt_press")!],
      },
    ],
  },
  {
    id: "preset_cinematic_scail_recast",
    name: "Cinematic Recast / Locker Room Thriller",
    description:
      "End of Watch / Sicario style tactical officer sequence calibrated for Wan 2.1 SCAIL-2 character replacement.",
    lockedPrompt: "cinematic film still of police officer in locker room",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    sections: [
      {
        id: "sec_subject",
        name: "Subject",
        category: "subject",
        color: "#2563eb",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 1,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "sub_tactical_officer")!],
      },
      {
        id: "sec_apparel",
        name: "Apparel",
        category: "apparel",
        color: "#4f46e5",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 2,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "app_tactical_uniform")!],
      },
      {
        id: "sec_environment",
        name: "Environment",
        category: "environment",
        color: "#059669",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 3,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "env_police_locker_room")!],
      },
      {
        id: "sec_lighting",
        name: "Lighting",
        category: "lighting",
        color: "#d97706",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 4,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "lit_cold_fluorescent")!],
      },
      {
        id: "sec_camera",
        name: "Camera",
        category: "camera",
        color: "#dc2626",
        enabled: true,
        randomize: false,
        endSeparator: "comma",
        showLabel: false,
        order: 5,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "cam_cooke_35mm_anamorphic")!],
      },
      {
        id: "sec_style",
        name: "Style",
        category: "style",
        color: "#7c3aed",
        enabled: true,
        randomize: false,
        endSeparator: "none",
        showLabel: false,
        order: 6,
        entries: [BUILTIN_ENTRIES.find((e) => e.id === "sty_kodak_vision3_5219")!],
      },
    ],
  },
];

export function getBuiltinEntries(): PromptEntry[] {
  return [...BUILTIN_ENTRIES];
}

export function getEntriesByCategory(category: PromptCategory): PromptEntry[] {
  return BUILTIN_ENTRIES.filter((e) => e.category === category);
}

export function searchEntries(query: string, category?: PromptCategory): PromptEntry[] {
  const q = query.toLowerCase().trim();
  return BUILTIN_ENTRIES.filter((e) => {
    if (category && e.category !== category) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.text.toLowerCase().includes(q) ||
      e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });
}

export function getPresetById(presetId: string): PromptComposerPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === presetId);
}
