import { NextResponse } from "next/server";
import { ttsRequestSchema } from "@/lib/audio/validation";
import { resolveAudioRoute } from "@/lib/generation/registry";
import { enqueueGeneration, generationErrorResponse, requireGenerationUser } from "@/lib/generation/service";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireGenerationUser();
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errorCode: "INVALID_JSON", message: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }
  const parsed = ttsRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_TTS_REQUEST", message: "Revisa el guion y los controles.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });

  try {
    const result = await enqueueGeneration({
      userId: user.id,
      kind: "audio",
      queueKind: "audio",
      route: resolveAudioRoute("tts", "f5-tts"),
      request: { kind: "tts", ...parsed.data },
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json({ ...result, kind: "tts", errorCode: result.errorCode ?? (result.status === "not_configured" ? "AUDIO_PROVIDER_NOT_CONFIGURED" : undefined) }, { status: result.status === "not_configured" ? 503 : 202 });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json({ ...result.body, kind: "tts", creditsReserved: 0 }, { status: result.status });
  }
}
