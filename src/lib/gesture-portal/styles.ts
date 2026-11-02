import type { PortalStyleConfig, PortalStyleId } from "./types";
import { MASTER_NEGATIVE_PROMPT } from "@/lib/prompt-composer/library";

export const PORTAL_STYLES: Record<PortalStyleId, PortalStyleConfig> = {
  anime: {
    id: "anime",
    name: "Anime Shinkai Sky",
    description: "Estilo anime cinematográfico con paleta vibrante, cielos luminosos y sombreado cel-shaded.",
    positivePrompt:
      "masterpiece anime key visual by Makoto Shinkai, crisp linework, vibrant sky reflections, expressive eyes, delicate specular rim lighting",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.0,
    denoiseStrength: 0.65,
    steps: 4,
  },
  doodle: {
    id: "doodle",
    name: "Hand-Drawn Ink Doodle",
    description: "Ilustración en tinta negra sobre papel marfil, trazos gestuales y sombreado achurado.",
    positivePrompt:
      "expressive black ink line art on warm ivory sketch paper, dynamic crosshatching, continuous contour line drawing, editorial illustration",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.5,
    denoiseStrength: 0.75,
    steps: 4,
  },
  painted_3d: {
    id: "painted_3d",
    name: "Arcane Stylized 3D",
    description: "Cinemática de animación 3D estilizada con texturas pintadas a mano e iluminación volumétrica.",
    positivePrompt:
      "Fortiche Arcane style 3D animation still, visible digital brushstrokes, moody rim light, painterly textures, cinematic color grading",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.2,
    denoiseStrength: 0.68,
    steps: 4,
  },
  noir_thriller: {
    id: "noir_thriller",
    name: "Chiaroscuro Noir",
    description: "Blanco y negro dramático de alto contraste, sombras profundas y textura de película clásica.",
    positivePrompt:
      "dramatic black and white film noir still, low-key lighting, harsh shadows, sharp rim light, 35mm Tri-X 400 film grain, silver gelatin print",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.5,
    denoiseStrength: 0.70,
    steps: 4,
  },
  claymation: {
    id: "claymation",
    name: "Tactile Claymation",
    description: "Stop-motion en plastilina modelada a mano con huellas dactilares visibles y luz de estudio cálida.",
    positivePrompt:
      "stop-motion claymation character still, sculpted plasticine with subtle real thumbprints, macro lens depth of field, warm miniature studio lighting",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.3,
    denoiseStrength: 0.72,
    steps: 4,
  },
  paper_cutout: {
    id: "paper_cutout",
    name: "Layered Paper Cut-Out",
    description: "Collage de capas de papel artesanal recortado con sombras arrojadas reales.",
    positivePrompt:
      "layered paper craft cut-out illustration, textured cardstock layers, sharp drop shadows between paper planes, tactile relief",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.4,
    denoiseStrength: 0.75,
    steps: 4,
  },
  halftone_press: {
    id: "halftone_press",
    name: "Editorial Halftone Press",
    description: "Trama de semitonos de periódico editorial estilo The Wall Street Journal sobre papel prensa.",
    positivePrompt:
      "vintage newspaper print with visible halftone dot screen pattern, single-color ink press on newsprint, authentic photojournalism archive",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.5,
    denoiseStrength: 0.70,
    steps: 4,
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Neon Noir Atmosphere",
    description: "Atmósfera nocturna urbana con reflejos de lluvia y neón orgánico, sin mallas de IA genéricas.",
    positivePrompt:
      "cinematic rain-soaked urban night, anamorphic lens flares, cyan and amber neon reflections in asphalt puddles, moody atmosphere",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 2.0,
    denoiseStrength: 0.65,
    steps: 4,
  },
  fiduciary_anchor: {
    id: "fiduciary_anchor",
    name: "Fiduciary Finance Anchor",
    description: "Presentador financiero de alta convicción en trading floor con traje Savile Row y monitores Bloomberg.",
    positivePrompt:
      "authoritative financial market strategist in bespoke navy suit, Bloomberg terminal screens in soft background, 85mm portrait bokeh, high-end editorial",
    negativePrompt: MASTER_NEGATIVE_PROMPT,
    cfgScale: 1.8,
    denoiseStrength: 0.55,
    steps: 4,
  },
};

export function listPortalStyles(): PortalStyleConfig[] {
  return Object.values(PORTAL_STYLES);
}

export function getPortalStyle(id: PortalStyleId): PortalStyleConfig | undefined {
  return PORTAL_STYLES[id];
}
