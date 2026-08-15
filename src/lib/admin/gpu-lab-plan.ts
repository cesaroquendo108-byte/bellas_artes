export type GpuLabReadiness =
  | "cached_ready"
  | "bootstrap_ready"
  | "manual_preparation"
  | "conditional"
  | "blocked_3090"
  | "policy_blocked";

export interface GpuLabCase {
  id: string;
  order: number;
  title: string;
  modelIds: readonly string[];
  templateIds: readonly string[];
  readiness: GpuLabReadiness;
  timeboxMinutes: number;
  minimumVramGb: number | null;
  objective: string;
  prompt: string | null;
  settings: readonly string[];
  successCriteria: readonly string[];
  blocker: string | null;
}

export const GPU_LAB_PLAN = [
  {
    id: "flux-schnell-baseline",
    order: 1,
    title: "FLUX.1 Schnell · baseline",
    modelIds: ["flux-schnell"],
    templateIds: ["flux-schnell-minimal", "flux-schnell-full-t2i"],
    readiness: "cached_ready",
    timeboxMinutes: 15,
    minimumVramGb: 24,
    objective: "Confirmar que GPU, ComfyUI y el checkpoint cacheado producen una imagen reproducible.",
    prompt: "A contemporary Venezuelan art pavilion at dusk, cinematic architectural photography, warm practical lights, realistic materials",
    settings: ["1024×1024", "4 pasos", "CFG 1", "seed 41001"],
    successCriteria: ["Sin nodos rojos", "Output guardado", "VRAM y tiempo anotados", "Segundo run con la misma seed reproduce la composición"],
    blocker: null,
  },
  {
    id: "flux2-klein-core",
    order: 2,
    title: "FLUX.2 Klein 4B · generación y edición",
    modelIds: ["flux2-klein-4b"],
    templateIds: ["flux2-klein-4b-t2i", "flux2-klein-4b-image-edit"],
    readiness: "bootstrap_ready",
    timeboxMinutes: 20,
    minimumVramGb: 13,
    objective: "Medir velocidad de preview, fidelidad al prompt y una edición sencilla con referencia.",
    prompt: "Editorial product photograph of a handmade ceramic coffee set, deep blue glaze, neutral studio background, soft directional light",
    settings: ["1024×1024", "T2I primero", "Una edición de fondo", "Registrar tiempo frío y caliente"],
    successCriteria: ["T2I completo", "Edición conserva el objeto", "Sin OOM", "Tiempo caliente anotado"],
    blocker: null,
  },
  {
    id: "z-image-core",
    order: 3,
    title: "Z-Image · retrato y composición",
    modelIds: ["z-image"],
    templateIds: ["z-image-t2i"],
    readiness: "bootstrap_ready",
    timeboxMinutes: 15,
    minimumVramGb: 12,
    objective: "Comparar retrato, piel, manos y composición contra Klein 4B.",
    prompt: "Natural-light editorial portrait of a Venezuelan painter in a bright studio, paint-stained linen apron, authentic skin texture, hands visible",
    settings: ["1024×1024", "Una seed fija", "Repetir una vez con prompt corto"],
    successCriteria: ["Rostro coherente", "Manos evaluables", "Sin OOM", "Comparación A/B anotada"],
    blocker: null,
  },
  {
    id: "sdxl-baseline",
    order: 4,
    title: "SDXL Base + Refiner",
    modelIds: ["sdxl-base-1.0", "sdxl-refiner-1.0"],
    templateIds: ["sdxl-simple-official", "sdxl-checkpoint-study"],
    readiness: "bootstrap_ready",
    timeboxMinutes: 20,
    minimumVramGb: 12,
    objective: "Obtener una referencia SDXL y medir el coste real del refiner.",
    prompt: "Museum catalogue photograph of a geometric sculpture made of polished brass and dark tropical wood, seamless grey backdrop",
    settings: ["1024×1024", "Base sin refiner", "Base + refiner", "Misma seed"],
    successCriteria: ["Ambas ramas completan", "Diferencia visual documentada", "Tiempo extra del refiner anotado"],
    blocker: null,
  },
  {
    id: "real-esrgan-core",
    order: 5,
    title: "Real-ESRGAN · upscale",
    modelIds: ["real-esrgan"],
    templateIds: ["real-esrgan-image-upscale-study"],
    readiness: "bootstrap_ready",
    timeboxMinutes: 10,
    minimumVramGb: 8,
    objective: "Escalar el mejor output del bloque de imagen y revisar textura, bordes y artefactos.",
    prompt: null,
    settings: ["Usar output de Klein o Z-Image", "x4", "Comparar al 100%"],
    successCriteria: ["Archivo x4 generado", "Sin halos severos", "Tiempo y VRAM anotados"],
    blocker: null,
  },
  {
    id: "sd35-gated",
    order: 6,
    title: "SD3.5 Medium · tipografía",
    modelIds: ["sd35-medium"],
    templateIds: ["sd35-simple"],
    readiness: "manual_preparation",
    timeboxMinutes: 20,
    minimumVramGb: 24,
    objective: "Medir seguimiento de prompt y texto legible contra Klein/SDXL.",
    prompt: "A premium exhibition poster that clearly reads BELLAS ARTES, cobalt blue and warm yellow, Swiss editorial grid, print-ready design",
    settings: ["1024×1024", "Checkpoint Medium", "Una seed fija"],
    successCriteria: ["Texto evaluable", "Sin OOM", "Tiempo anotado"],
    blocker: "Modelo gated: no se descarga en el bootstrap público; necesita token temporal y mapear el checkpoint Medium.",
  },
  {
    id: "pose-control",
    order: 7,
    title: "DWPose + ControlNet",
    modelIds: ["controlnet-dwpose"],
    templateIds: ["dwpose-guided-composition"],
    readiness: "manual_preparation",
    timeboxMinutes: 15,
    minimumVramGb: 16,
    objective: "Comprobar que una pose de referencia controla cuerpo y encuadre.",
    prompt: "Full-body fashion editorial, confident standing pose, clean studio cyclorama, balanced anatomy",
    settings: ["Una referencia propia", "Control moderado", "No usar InsightFace"],
    successCriteria: ["Pose reconocible", "Sin detector restringido", "Consentimiento de la referencia"],
    blocker: "Falta fijar el custom node DWPose y un checkpoint base compatible con el ControlNet SD1.5 instalado.",
  },
  {
    id: "wan22-short-clip",
    order: 8,
    title: "Wan 2.2 TI2V-5B · clip corto",
    modelIds: ["wan22-ti2v-5b"],
    templateIds: ["wan22-5b-ti2v", "wan22-5b-fun-control"],
    readiness: "conditional",
    timeboxMinutes: 45,
    minimumVramGb: 24,
    objective: "Producir un único clip corto y medir tiempo, movimiento, memoria y coste.",
    prompt: "A slow camera push through a quiet contemporary art gallery, soft morning light, subtle cloth movement, cinematic realism",
    settings: ["Resolución mínima útil", "Duración corta", "Un solo job", "Sin Fun Control en el primer intento"],
    successCriteria: ["Clip reproducible", "Sin OOM", "Tiempo total anotado", "GPU destruida si excede el timebox"],
    blocker: "No forma parte del bootstrap de imagen; requiere descargar y mapear ~32 GB y puede consumir gran parte de la sesión.",
  },
  {
    id: "hunyuan15-offload",
    order: 9,
    title: "HunyuanVideo 1.5 · 480p destilado",
    modelIds: ["hunyuan-video-15-83b"],
    templateIds: ["hunyuan15-720p-t2v"],
    readiness: "conditional",
    timeboxMinutes: 35,
    minimumVramGb: 14,
    objective: "Verificar si la variante destilada 480p funciona con offload en 24 GB.",
    prompt: "A kinetic paper sculpture unfolding in a dark gallery, controlled camera, soft volumetric light",
    settings: ["480p", "Offload", "Un solo clip"],
    successCriteria: ["Carga sin OOM", "Clip corto", "Tiempo y RAM host anotados"],
    blocker: "La plantilla disponible es 720p y no coincide con el paquete 480p destilado instalado; requiere grafo específico.",
  },
  {
    id: "large-models",
    order: 10,
    title: "Modelos que no deben probarse en 3090",
    modelIds: ["qwen-image", "hunyuan-video-original"],
    templateIds: ["qwen-image-t2i"],
    readiness: "blocked_3090",
    timeboxMinutes: 0,
    minimumVramGb: 48,
    objective: "Evitar perder la ventana en modelos que requieren 48 GB o una cuantización todavía no validada.",
    prompt: null,
    settings: ["No cargar", "Reservar GPU de 48–80 GB en otra sesión"],
    successCriteria: ["No se consume tiempo ni saldo en una carga inviable"],
    blocker: "Qwen-Image base y Hunyuan original exceden la estrategia validada para 24 GB.",
  },
  {
    id: "research-policy",
    order: 11,
    title: "Investigación, voz y dependencias aisladas",
    modelIds: ["flux-dev", "flux2-klein-9b", "wai-ani-ponyxl", "f5-tts-official", "rvc", "liveportrait-no-insightface", "cmu-openpose", "insightface-models"],
    templateIds: ["flux-dev-full-t2i"],
    readiness: "policy_blocked",
    timeboxMinutes: 0,
    minimumVramGb: null,
    objective: "Mantener fuera de la sesión comercial modelos con licencias, consentimiento o dependencias pendientes.",
    prompt: null,
    settings: ["No publicar outputs", "No usar voces ajenas", "No usar InsightFace"],
    successCriteria: ["La sesión pública no los expone ni los ofrece como capacidad aprobada"],
    blocker: "Requieren revisión de licencia, consentimiento, moderación o reemplazo técnico antes de ofrecerse.",
  },
] as const satisfies readonly GpuLabCase[];

export function summarizeGpuLabPlan() {
  const runnable = GPU_LAB_PLAN.filter((item) => item.readiness === "cached_ready" || item.readiness === "bootstrap_ready");
  return {
    total: GPU_LAB_PLAN.length,
    runnable: runnable.length,
    runnableMinutes: runnable.reduce((total, item) => total + item.timeboxMinutes, 0),
    manual: GPU_LAB_PLAN.filter((item) => item.readiness === "manual_preparation").length,
    conditional: GPU_LAB_PLAN.filter((item) => item.readiness === "conditional").length,
    blocked: GPU_LAB_PLAN.filter((item) => item.readiness === "blocked_3090" || item.readiness === "policy_blocked").length,
  };
}
