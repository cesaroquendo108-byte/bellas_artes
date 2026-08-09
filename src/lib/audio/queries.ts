import "server-only";

import { requireUser } from "@/lib/auth";
import { getPrivateObjectUrl } from "@/lib/storage/r2";
import { createClient } from "@/utils/supabase/server";
import { audioVoiceCatalog } from "./catalog";
import { getAudioProviderStatus } from "./provider";
import type { AudioLibraryItem } from "./types";

export async function getAudioWorkspaceData() {
  const { profile } = await requireUser();
  const supabase = await createClient();
  const provider = getAudioProviderStatus();

  const [jobsResult, assetsResult, projectsResult] = await Promise.all([
    supabase
      .from("audio_jobs")
      .select("id,kind,status,output_asset_id,created_at,error_message")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("assets")
      .select("id,name,r2_key,mime_type,metadata,created_at")
      .eq("user_id", profile.id)
      .eq("type", "audio")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("audio_projects")
      .select("id,name,duration_ms,preset,updated_at")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  const setupPending = jobsResult.error?.code === "42P01" || projectsResult.error?.code === "42P01";
  const assets = assetsResult.error ? [] : await Promise.all((assetsResult.data ?? []).map(async (asset) => {
    let signedUrl: string | null = null;
    try {
      signedUrl = await getPrivateObjectUrl(asset.r2_key);
    } catch {
      signedUrl = null;
    }
    return {
      id: asset.id,
      name: asset.name,
      kind: "audio" as const,
      status: "ready" as const,
      createdAt: asset.created_at,
      durationSeconds: Number((asset.metadata as Record<string, unknown> | null)?.durationSeconds ?? 0) || null,
      signedUrl,
      mimeType: asset.mime_type,
    };
  }));

  const jobs: AudioLibraryItem[] = setupPending || jobsResult.error ? [] : (jobsResult.data ?? []).map((job) => ({
    id: job.id,
    name: job.kind === "tts" ? "Voz generada" : job.kind === "voice_changer" ? "Voz transformada" : "Mezcla de audio",
    kind: job.kind,
    status: job.status,
    createdAt: job.created_at,
    durationSeconds: null,
    signedUrl: null,
  }));

  return {
    provider,
    voices: audioVoiceCatalog,
    jobs,
    assets,
    projects: setupPending || projectsResult.error ? [] : projectsResult.data ?? [],
    setupPending,
  };
}
