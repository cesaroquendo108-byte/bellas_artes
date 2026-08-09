import { NextResponse } from "next/server";
import { providerUnavailable } from "@/lib/audio/http";
import { getAudioProvider } from "@/lib/audio/provider";
import { mixRequestSchema } from "@/lib/audio/validation";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 });
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
  const { data: project, error: projectError } = await supabase
    .from("audio_projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (projectError) return NextResponse.json({ errorCode: "PROJECT_LOOKUP_FAILED", message: "No se pudo verificar el proyecto." }, { status: 500 });
  if (!project) return NextResponse.json({ errorCode: "PROJECT_NOT_FOUND", message: "Proyecto no encontrado." }, { status: 404 });
  const provider = getAudioProvider();
  if (provider.state !== "configured") return providerUnavailable("video_mix");
  return providerUnavailable("video_mix");
}
