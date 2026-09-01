import { NextResponse } from "next/server";
import { audioProjectSchema } from "@/lib/audio/validation";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 });
  const parsed = audioProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_PROJECT", message: "Revisa la línea de tiempo." }, { status: 422 });
  const input = parsed.data;
  const assetIds = [...new Set([input.sourceVideoAssetId, ...input.tracks.map((track) => track.assetId)].filter(Boolean))] as string[];
  const admin = createAdminClient();
  if (assetIds.length) {
    const { data, error } = await admin.from("assets").select("id").eq("user_id", user.id).in("id", assetIds);
    if (error) return NextResponse.json({ errorCode: "ASSET_LOOKUP_FAILED", message: "No se pudieron verificar los archivos del proyecto." }, { status: 503 });
    if ((data?.length ?? 0) !== assetIds.length) return NextResponse.json({ errorCode: "INVALID_ASSET_OWNER", message: "Uno de los archivos no pertenece a tu biblioteca." }, { status: 403 });
  }
  const { data: projectId, error } = await admin.rpc("save_audio_project", {
    p_user_id: user.id,
    p_name: input.name,
    p_source_video_asset_id: input.sourceVideoAssetId,
    p_duration_ms: input.durationMs,
    p_preset: input.preset,
    p_tracks: input.tracks,
    p_project_id: input.id ?? null,
  });
  if (error) {
    if (error.message.includes("PROJECT_NOT_FOUND")) return NextResponse.json({ errorCode: "PROJECT_NOT_FOUND", message: "Proyecto no encontrado." }, { status: 404 });
    return NextResponse.json({ errorCode: "PROJECT_SAVE_FAILED", message: "No se pudo guardar el proyecto de audio." }, { status: 503 });
  }
  if (!projectId) return NextResponse.json({ errorCode: "PROJECT_SAVE_FAILED", message: "No se pudo guardar el proyecto de audio." }, { status: 503 });
  return NextResponse.json({ projectId }, { status: 201 });
}
