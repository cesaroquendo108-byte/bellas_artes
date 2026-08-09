const defaultBlockedTerms = ["child sexual", "csam", "sexual minor", "deepfake without consent"];

export interface ModerationResult {
  allowed: boolean;
  code?: "PROMPT_BLOCKED";
  reason?: string;
}

export function moderateGenerationInput(input: { prompt?: string; negativePrompt?: string }): ModerationResult {
  const configured = process.env.GENERATION_BLOCKED_TERMS
    ?.split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
  const terms = configured?.length ? configured : defaultBlockedTerms;
  const haystack = `${input.prompt ?? ""}\n${input.negativePrompt ?? ""}`.toLowerCase();
  const match = terms.find((term) => haystack.includes(term));
  return match
    ? { allowed: false, code: "PROMPT_BLOCKED", reason: "La solicitud no supera la moderación de seguridad." }
    : { allowed: true };
}
