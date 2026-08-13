import type { CommunityCategory } from "@/lib/social/contracts";

export type CapabilityStatus =
  | "available"
  | "admin_only"
  | "beta"
  | "preparing";

export type LandingCategory =
  | "image"
  | "video"
  | "audio"
  | "character"
  | "world"
  | "director";

export type LandingAssetKey =
  | "hero-director"
  | "template-music-video"
  | "template-product-ad"
  | "template-ad-remake"
  | "template-social"
  | "template-ugc"
  | "template-micro-drama"
  | "template-brand-film"
  | "template-explainer"
  | "template-trailer"
  | "capability-image"
  | "capability-video"
  | "capability-audio"
  | "capability-character";

export type LandingCapability = {
  id: string;
  title: string;
  description: string;
  href?: string;
  status: CapabilityStatus;
  imageKey?: LandingAssetKey;
  category: LandingCategory;
};

export const statusLabels: Record<CapabilityStatus, string> = {
  available: "Disponible",
  admin_only: "Admin Preview",
  beta: "Preparado para beta",
  preparing: "En preparación",
};

export const landingAssets: Record<LandingAssetKey, string> = {
  "hero-director": "/landing/hero-director.webp",
  "template-music-video": "/landing/template-music-video.webp",
  "template-product-ad": "/landing/template-product-ad.webp",
  "template-ad-remake": "/landing/template-ad-remake.webp",
  "template-social": "/landing/template-social.webp",
  "template-ugc": "/landing/template-ugc.webp",
  "template-micro-drama": "/landing/template-micro-drama.webp",
  "template-brand-film": "/landing/template-brand-film.webp",
  "template-explainer": "/landing/template-explainer.webp",
  "template-trailer": "/landing/template-trailer.webp",
  "capability-image": "/landing/capability-image.webp",
  "capability-video": "/landing/capability-video.webp",
  "capability-audio": "/landing/capability-audio.webp",
  "capability-character": "/landing/capability-character.webp",
};

export const quickStarts = [
  {
    id: "director",
    title: "Director",
    description: "De la idea a un proyecto con escenas y ritmo.",
    href: "/director?template=short-film",
    status: "available",
    imageKey: "hero-director",
    category: "director",
  },
  {
    id: "image",
    title: "Imagen",
    description: "Prompts, referencias, galería y kits de marca.",
    href: "/image",
    status: "admin_only",
    imageKey: "capability-image",
    category: "image",
  },
  {
    id: "video",
    title: "Video",
    description: "Texto, imagen o metraje como punto de partida.",
    href: "/video/t2v",
    status: "beta",
    imageKey: "capability-video",
    category: "video",
  },
  {
    id: "character",
    title: "Personaje",
    description: "Identidades visuales preparadas para consistencia.",
    href: "/characters/create",
    status: "beta",
    imageKey: "capability-character",
    category: "character",
  },
  {
    id: "world",
    title: "Mundo",
    description: "Escenarios, atmósferas y referencias persistentes.",
    href: "/world",
    status: "beta",
    imageKey: "template-brand-film",
    category: "world",
  },
  {
    id: "audio",
    title: "Audio",
    description: "Texto a voz, cambio de voz y biblioteca privada.",
    href: "/audio/tts",
    status: "beta",
    imageKey: "capability-audio",
    category: "audio",
  },
] satisfies Array<LandingCapability & { href: string }>;

export const directorTemplates = [
  { id: "short-film", title: "Cortometraje", description: "Una historia compacta con estructura cinematográfica.", href: "/director?template=short-film", status: "available", imageKey: "hero-director", category: "director" },
  { id: "music-video", title: "Videoclip", description: "Ritmo, identidad y secuencias guiadas por música.", href: "/director?template=music-video", status: "available", imageKey: "template-music-video", category: "director" },
  { id: "product-ads", title: "Anuncio de producto", description: "Una narrativa visual enfocada en producto y conversión.", href: "/director?template=product-ads", status: "available", imageKey: "template-product-ad", category: "director" },
  { id: "ugc-ads", title: "Anuncio UGC", description: "Guion breve con lenguaje natural para redes.", href: "/director?template=ugc-ads", status: "available", imageKey: "template-ugc", category: "director" },
  { id: "micro-drama", title: "Microdrama", description: "Conflicto rápido, giro y cierre memorable.", href: "/director?template=micro-drama", status: "available", imageKey: "template-micro-drama", category: "director" },
  { id: "brand-film", title: "Película de marca", description: "Una pieza editorial para expresar identidad y propósito.", href: "/director?template=brand-film", status: "available", imageKey: "template-brand-film", category: "director" },
  { id: "explainer", title: "Explicador", description: "Un concepto complejo convertido en una historia clara.", href: "/director?template=explainer", status: "available", imageKey: "template-explainer", category: "director" },
  { id: "film-trailer", title: "Tráiler", description: "Promesa, tensión y montaje en una pieza de impacto.", href: "/director?template=film-trailer", status: "available", imageKey: "template-trailer", category: "director" },
] satisfies Array<LandingCapability & { href: string }>;

export const suiteCapabilities = [
  { id: "create-image", title: "Crear imagen", description: "Genera y reinventa imágenes con referencias y assets privados.", href: "/image", status: "admin_only", imageKey: "capability-image", category: "image" },
  { id: "create-video", title: "Crear video", description: "Estudios separados para T2V, I2V y V2V, sin aliases ficticios.", href: "/video", status: "beta", imageKey: "capability-video", category: "video" },
  { id: "consistent-characters", title: "Personajes consistentes", description: "Organiza identidad, referencias, pose y bloqueo facial.", href: "/characters", status: "beta", imageKey: "capability-character", category: "character" },
  { id: "visual-worlds", title: "Mundos visuales", description: "Guarda escenarios y atmósferas para reutilizarlos en historias.", href: "/world", status: "beta", imageKey: "template-brand-film", category: "world" },
  { id: "audio-voice", title: "Audio y voz", description: "TTS, cambio de voz y una biblioteca con acceso firmado.", href: "/audio/my", status: "beta", imageKey: "capability-audio", category: "audio" },
  { id: "editing", title: "Edición y mejora", description: "Upscale, lip-sync, extensión y herramientas especializadas.", href: "/video", status: "beta", imageKey: "template-ad-remake", category: "video" },
] satisfies Array<LandingCapability & { href: string }>;

export const models = [
  { id: "flux-schnell", title: "Flux Schnell", copy: "Workflow real de imagen; acceso restringido mientras se valida la infraestructura.", status: "admin_only" as const, category: "Imagen" },
  { id: "flux-dev", title: "Flux Dev", copy: "Ruta premium prevista para perfiles Pro y equipos B2B.", status: "preparing" as const, category: "Imagen Pro" },
  { id: "pixart-sigma", title: "PixArt-Sigma", copy: "Borradores económicos previstos; falta exportar y validar su workflow.", status: "preparing" as const, category: "Imagen abierta" },
  { id: "sd35-medium", title: "Stable Diffusion 3.5 Medium", copy: "Mayor control de texto en imagen; licencia gated pendiente de revisión.", status: "preparing" as const, category: "Imagen abierta" },
  { id: "hunyuan-video", title: "HunyuanVideo", copy: "Backends operation-specific para video estándar y premium.", status: "preparing" as const, category: "Video" },
  { id: "f5-rvc", title: "F5-TTS + RVC", copy: "Voz en español y cambio de voz con consentimiento explícito.", status: "preparing" as const, category: "Audio" },
];

export const inspirationCategories: Array<{
  title: string;
  description: string;
  category: CommunityCategory;
  imageKey: LandingAssetKey;
  focus?: string;
}> = [
  { title: "Marketing y publicidad", description: "Campañas, producto y piezas para vender con claridad.", category: "marketing-advertising", imageKey: "template-product-ad" },
  { title: "Cine e historias", description: "Escenas, storyboards y universos narrativos.", category: "film-stories", imageKey: "hero-director" },
  { title: "Música", description: "Videoclips, visualizers, portadas y atmósferas sonoras.", category: "music-video", imageKey: "template-music-video" },
  { title: "Animación", description: "Ilustración, 3D y personajes con estilo propio.", category: "animation", imageKey: "template-explainer" },
  { title: "UGC", description: "Ideas directas para redes, creadores y comercio local.", category: "ugc", imageKey: "template-ugc" },
  { title: "Anime", description: "Retratos, secuencias y mundos de estética anime.", category: "anime", imageKey: "capability-character" },
  { title: "Gaming y concept art", description: "Entornos, props y personajes para imaginar un juego.", category: "film-stories", focus: "gaming-concept-art", imageKey: "template-brand-film" },
  { title: "Explainer", description: "Conceptos y productos convertidos en relatos fáciles de seguir.", category: "animation", focus: "explainer", imageKey: "template-explainer" },
  { title: "Mood y atmósfera", description: "Luz, color y dirección visual para definir una emoción.", category: "film-stories", focus: "mood-atmosphere", imageKey: "template-trailer" },
];

export function buildLandingStudioHref(baseHref: string, prompt: string) {
  const url = new URL(baseHref, "https://bellas-artes.local");
  const cleanPrompt = prompt.trim();
  if (cleanPrompt) url.searchParams.set("prompt", cleanPrompt);
  return `${url.pathname}${url.search}`;
}

export const faqs = [
  { question: "¿La plataforma ya genera para todo el público?", answer: "Todavía no. La generación real permanece restringida mientras cerramos infraestructura, seguridad y costos. La interfaz siempre muestra el estado de cada herramienta." },
  { question: "¿Mis creaciones son privadas?", answer: "Los assets del estudio se guardan como recursos privados y se consultan mediante URLs firmadas. La publicación comunitaria es una acción separada y explícita." },
  { question: "¿Cómo funcionan los créditos?", answer: "Bellas Artes usa una billetera auditable. Durante la beta técnica el billing permanece en modo shadow, por lo que no se habilita cobro público por generación." },
  { question: "¿Puedo usar el contenido comercialmente?", answer: "El uso comercial dependerá del modelo, el plan y los términos finales. Antes de la beta pública publicaremos condiciones claras por modalidad." },
  { question: "¿Qué es la integración MCP?", answer: "Es un acceso controlado para operar herramientas de Bellas Artes desde clientes compatibles. El endpoint ya existe, pero las conexiones de escritorio continúan en validación." },
  { question: "¿Cómo entro a la beta privada?", answer: "El acceso se abre por invitación. Puedes entrar con Google y conservar tu cuenta lista mientras terminamos los gates técnicos." },
];

export const primaryLandingRoutes = [
  "/login?next=/dashboard",
  "/inspire",
  ...quickStarts.flatMap((item) => (item.href ? [item.href] : [])),
  ...directorTemplates.flatMap((item) => (item.href ? [item.href] : [])),
  ...suiteCapabilities.flatMap((item) => (item.href ? [item.href] : [])),
] as const;
