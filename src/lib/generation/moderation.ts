const defaultBlockedTerms = [
  "child sexual",
  "child porn",
  "csam",
  "sexual minor",
  "abuso sexual infantil",
  "explotacion sexual infantil",
  "pornografia infantil",
  "violencia sexual",
  "deepfake without consent",
  "deepfake sin consentimiento",
];

const realIdentityTerms = [
  "persona real",
  "real person",
  "celebridad",
  "celebrity",
  "famoso",
  "famosa",
  "politico",
  "politica",
  "actor",
  "actriz",
  "rostro de",
  "face swap",
  "suplantar",
  "suplantacion",
  "imitar a",
  "clonar la cara",
];

const nonConsensualTerms = [
  "sin consentimiento",
  "sin su permiso",
  "sin permiso",
  "no consent",
  "without consent",
  "non-consensual",
  "revenge porn",
];

const explicitConsentTerms = [
  "con consentimiento",
  "consentimiento explicito",
  "with consent",
  "authorized likeness",
  "imagen autorizada",
];

export interface ModerationResult {
  allowed: boolean;
  code?: "PROMPT_BLOCKED";
  reason?: string;
}

export function moderateGenerationInput(input: { prompt?: string; negativePrompt?: string }): ModerationResult {
  const configured = process.env.GENERATION_BLOCKED_TERMS
    ?.split(",")
    .map(normalize)
    .filter(Boolean);
  const terms = configured?.length ? configured : defaultBlockedTerms.map(normalize);
  const haystack = normalize(`${input.prompt ?? ""}\n${input.negativePrompt ?? ""}`);
  const match = terms.find((term) => haystack.includes(term));
  if (match) return blocked();

  const targetsRealIdentity = realIdentityTerms.some((term) => haystack.includes(term));
  const lacksConsent = nonConsensualTerms.some((term) => haystack.includes(term));
  const explicitlyConsented = explicitConsentTerms.some((term) => haystack.includes(term));
  if (targetsRealIdentity && lacksConsent && !explicitlyConsented) return blocked();
  if (targetsRealIdentity && haystack.includes("deepfake") && !explicitlyConsented) return blocked();
  return { allowed: true };
}

export async function moderateGenerationRequest(input: { prompt?: string; negativePrompt?: string }): Promise<ModerationResult> {
  const local = moderateGenerationInput(input);
  if (!local.allowed || process.env.GENERATION_MODERATION_LEVEL !== "l2") return local;

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.GENERATION_MODERATION_MODEL?.trim();
  if (process.env.GENERATION_MODERATION_PROVIDER !== "openrouter" || !apiKey || !model) {
    throw new Error("GENERATION_L2_MODERATION_NOT_CONFIGURED");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Clasifica solicitudes creativas. Bloquea abuso sexual infantil, suplantación o deepfakes de personas reales sin consentimiento, violencia sexual y explotación. Responde JSON estricto: {\"allowed\":boolean,\"reason\":string}.",
        },
        { role: "user", content: JSON.stringify({ prompt: input.prompt ?? "", negativePrompt: input.negativePrompt ?? "" }) },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GENERATION_L2_MODERATION_HTTP_${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("GENERATION_L2_MODERATION_INVALID");
  let decision: { allowed?: unknown; reason?: unknown };
  try {
    decision = JSON.parse(content) as { allowed?: unknown; reason?: unknown };
  } catch {
    throw new Error("GENERATION_L2_MODERATION_INVALID");
  }
  if (typeof decision.allowed !== "boolean") throw new Error("GENERATION_L2_MODERATION_INVALID");
  return decision.allowed
    ? { allowed: true }
    : { allowed: false, code: "PROMPT_BLOCKED", reason: typeof decision.reason === "string" ? decision.reason.slice(0, 500) : "La solicitud no supera la moderación de seguridad." };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function blocked(): ModerationResult {
  return { allowed: false, code: "PROMPT_BLOCKED", reason: "La solicitud no supera la moderación de seguridad." };
}
