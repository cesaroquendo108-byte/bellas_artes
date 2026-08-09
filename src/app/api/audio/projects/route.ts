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
    const { data } = await admin.from("assets").select("id").eq("user_id", user.id).in("id", assetIds);
    if ((data?.length ?? 0) !== assetIds.length) return NextResponse.json({ errorCode: "INVALID_ASSET_OWNER", message: "Uno de los archivos no pertenece a tu biblioteca." }, { status: 403 });
  }
  let projectId = input.id;
  if (projectId) {
    const { data } = await admin.from("audio_projects").select("id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
    if (!data) return NextResponse.json({ errorCode: "PROJECT_NOT_FOUND" }, { status: 404 });
    const { error } = await admin.from("audio_projects").update({ name: input.name, source_video_asset_id: input.sourceVideoAssetId, duration_ms: input.durationMs, preset: input.preset }).eq("id", projectId).eq("user_id", user.id);
    if (error) return NextResponse.json({ errorCode: "PROJECT_SAVE_FAILED" }, { status: 500 });
  } else {
    const { data, error } = await admin.from("audio_projects").insert({ user_id: user.id, name: input.name, source_video_asset_id: input.sourceVideoAssetId, duration_ms: input.durationMs, preset: input.preset }).select("id").single();
    if (error || !data) return NextResponse.json({ errorCode: "PROJECT_SAVE_FAILED" }, { status: 500 });
    projectId = data.id;
  }
  await admin.from("audio_tracks").delete().eq("project_id", projectId).eq("user_id", user.id);
  if (input.tracks.length) {
    const { error } = await admin.from("audio_tracks").insert(input.tracks.map((track) => ({ project_id: projectId, user_id: user.id, asset_id: track.assetId, kind: track.kind, name: track.name, start_ms: track.startMs, trim_start_ms: track.trimStartMs, duration_ms: track.durationMs, volume: track.volume, speed: track.speed, muted: track.muted })));
    if (error) return NextResponse.json({ errorCode: "TRACK_SAVE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ projectId }, { status: 201 });
}
