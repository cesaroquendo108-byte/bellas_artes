import { z } from "zod";

const forbiddenClientFields = {
  userId: z.never().optional(),
  credits: z.never().optional(),
  amount: z.never().optional(),
};

export const ttsRequestSchema = z.object({
  ...forbiddenClientFields,
  idempotencyKey: z.string().trim().min(8).max(120),
  text: z.string().trim().min(1).max(10_000),
  voiceId: z.string().trim().min(1).max(120),
  format: z.enum(["mp3", "wav"]),
  speed: z.number().min(0.5).max(2),
  stability: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  style: z.number().min(0).max(1),
}).strict();

export const voiceChangerRequestSchema = z.object({
  ...forbiddenClientFields,
  idempotencyKey: z.string().trim().min(8).max(120),
  voiceId: z.string().trim().min(1).max(120),
  pitch: z.number().min(-12).max(12),
  speed: z.number().min(0.5).max(2),
  intensity: z.number().min(0).max(1),
  preserveEmotion: z.boolean(),
  consent: z.literal(true),
}).strict();

export const mixRequestSchema = z.object({
  ...forbiddenClientFields,
  idempotencyKey: z.string().trim().min(8).max(120),
  projectId: z.string().uuid(),
  format: z.enum(["mp4", "wav", "mp3"]),
}).strict();

export const audioProjectSchema = z.object({
  ...forbiddenClientFields,
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  sourceVideoAssetId: z.string().uuid().nullable(),
  durationMs: z.number().int().min(0).max(86_400_000),
  preset: z.record(z.string(), z.unknown()).default({}),
  tracks: z.array(z.object({
    id: z.string().uuid().optional(),
    assetId: z.string().uuid().nullable(),
    kind: z.enum(["voice", "music", "effect", "ambience"]),
    name: z.string().trim().min(1).max(120),
    startMs: z.number().int().min(0),
    trimStartMs: z.number().int().min(0),
    durationMs: z.number().int().min(0),
    volume: z.number().min(0).max(2),
    speed: z.number().min(0.25).max(4),
    muted: z.boolean(),
  }).strict()).max(64),
}).strict();

export const AUDIO_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
export const VIDEO_UPLOAD_LIMIT_BYTES = 500 * 1024 * 1024;
export const ACCEPTED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm", "audio/ogg"]);
export const ACCEPTED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function validateMediaFile(file: File, kind: "audio" | "video") {
  const accepted = kind === "audio" ? ACCEPTED_AUDIO_TYPES : ACCEPTED_VIDEO_TYPES;
  const limit = kind === "audio" ? AUDIO_UPLOAD_LIMIT_BYTES : VIDEO_UPLOAD_LIMIT_BYTES;
  if (!accepted.has(file.type)) return kind === "audio" ? "Formato no compatible. Usa MP3, WAV, M4A, OGG o WebM." : "Formato no compatible. Usa MP4, MOV o WebM.";
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > limit) return `El ${kind === "audio" ? "audio" : "video"} supera el límite de ${kind === "audio" ? "50 MB" : "500 MB"}.`;
  return null;
}

export const validateAudioFile = (file: File) => validateMediaFile(file, "audio");
