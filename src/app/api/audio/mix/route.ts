import { NextResponse } from "next/server";
import { mixRequestSchema } from "@/lib/audio/validation";
import { resolveAudioRoute } from "@/lib/generation/registry";
import { enqueueGeneration, generationErrorResponse, requireGenerationUser } from "@/lib/generation/service";
import { createClient } from "@/utils/supabase/server";

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
  const parsed = mixRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_MIX_REQUEST", message: "Revisa el proyecto y el formato de salida." }, { status: 422 });
  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("audio_projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (projectError) return NextResponse.json({ errorCode: "PROJECT_LOOKUP_FAILED", message: "No se pudo verificar el proyecto." }, { status: 500 });
  if (!project) return NextResponse.json({ errorCode: "PROJECT_NOT_FOUND", message: "Proyecto no encontrado." }, { status: 404 });
  try {
    const result = await enqueueGeneration({
      userId: user.id,
      kind: "audio",
      queueKind: "audio",
      route: resolveAudioRoute("video_mix", "f5-tts"),
      request: { kind: "video_mix", ...parsed.data },
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json({ ...result, kind: "video_mix" }, { status: result.status === "not_configured" ? 503 : 202 });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json({ ...result.body, kind: "video_mix", creditsReserved: 0 }, { status: result.status });
  }
}
