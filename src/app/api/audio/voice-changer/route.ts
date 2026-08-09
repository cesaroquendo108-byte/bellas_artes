import { NextResponse } from "next/server";
import { validateMediaFile, voiceChangerRequestSchema } from "@/lib/audio/validation";
import { persistGenerationInput } from "@/lib/generation/input";
import { isGenerationRouteConfigured } from "@/lib/generation/config";
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

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ errorCode: "INVALID_FORM", message: "No se pudo leer el audio." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ errorCode: "AUDIO_REQUIRED", message: "Selecciona un archivo de audio." }, { status: 422 });
  const fileError = validateMediaFile(file, "audio");
  if (fileError) return NextResponse.json({ errorCode: "INVALID_AUDIO", message: fileError }, { status: 422 });
  let payload: unknown = null;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return NextResponse.json({ errorCode: "INVALID_PAYLOAD", message: "Los controles de voz no son válidos." }, { status: 400 });
  }
  const parsed = voiceChangerRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_VOICE_REQUEST", message: "Debes confirmar el consentimiento y revisar los controles." }, { status: 422 });

  const route = resolveAudioRoute("voice_changer", "rvc");
  if (!isGenerationRouteConfigured(route)) return NextResponse.json({ jobId: null, kind: "voice_changer", status: "not_configured", creditsReserved: 0, errorCode: "AUDIO_PROVIDER_NOT_CONFIGURED", message: "La generación de audio todavía no está conectada." }, { status: 503 });
  try {
    const input = await persistGenerationInput({ userId: user.id, file, type: "audio", source: "voice-changer" });
    const result = await enqueueGeneration({
      userId: user.id,
      kind: "audio",
      queueKind: "audio",
      route,
      request: { kind: "voice_changer", ...parsed.data, sourceAssetIds: [input.id] },
      assetIds: [input.id],
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json({ ...result, kind: "voice_changer" }, { status: result.status === "not_configured" ? 503 : 202 });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json({ ...result.body, kind: "voice_changer", creditsReserved: 0 }, { status: result.status });
  }
}
