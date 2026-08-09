export const audioJobStatuses = ["queued", "processing", "ready", "failed", "canceled"] as const;
export type AudioJobStatus = (typeof audioJobStatuses)[number];

export const audioJobKinds = ["tts", "voice_changer", "voice_clone", "video_mix"] as const;
export type AudioJobKind = (typeof audioJobKinds)[number];

export type AudioProviderState = "configured" | "provider_unconfigured";
export type AudioTrackKind = "voice" | "music" | "effect" | "ambience";

export interface AudioVoice {
  id: string;
  name: string;
  language: string;
  category: string;
  description: string;
  previewUrl?: string;
}

export interface AudioJobResponse {
  jobId: string | null;
  kind: AudioJobKind;
  status: AudioJobStatus | "not_configured";
  creditsReserved: number;
  errorCode?: string;
  message?: string;
}

export interface AudioLibraryItem {
  id: string;
  name: string;
  kind: AudioJobKind | "audio";
  status: AudioJobStatus;
  createdAt: string;
  durationSeconds: number | null;
  signedUrl: string | null;
  mimeType?: string | null;
}
