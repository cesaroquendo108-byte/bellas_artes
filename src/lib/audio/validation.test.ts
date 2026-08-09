import { describe, expect, it } from "vitest";

import {
  audioProjectSchema,
  mixRequestSchema,
  ttsRequestSchema,
  validateMediaFile,
  voiceChangerRequestSchema,
} from "./validation";

const tts = {
  idempotencyKey: "request-1234",
  text: "Una narración breve",
  voiceId: "es-warm-narrator",
  format: "mp3",
  speed: 1,
  stability: 0.6,
  clarity: 0.75,
  style: 0.35,
};

describe("Audio contracts", () => {
  it("acepta TTS válido y rechaza prompt vacío o identidad del cliente", () => {
    expect(ttsRequestSchema.safeParse(tts).success).toBe(true);
    expect(ttsRequestSchema.safeParse({ ...tts, text: "" }).success).toBe(false);
    expect(ttsRequestSchema.safeParse({ ...tts, userId: crypto.randomUUID() }).success).toBe(false);
    expect(ttsRequestSchema.safeParse({ ...tts, ownerId: crypto.randomUUID() }).success).toBe(false);
  });

  it("exige consentimiento explícito para cambiar la voz", () => {
    const input = {
      idempotencyKey: "request-1234",
      voiceId: "es-warm-narrator",
      pitch: 0,
      speed: 1,
      intensity: 0.7,
      preserveEmotion: true,
      consent: true,
    };
    expect(voiceChangerRequestSchema.safeParse(input).success).toBe(true);
    expect(voiceChangerRequestSchema.safeParse({ ...input, consent: false }).success).toBe(false);
  });

  it("valida idempotencia, UUID y campos desconocidos en mezcla", () => {
    const input = {
      idempotencyKey: "request-1234",
      projectId: crypto.randomUUID(),
      format: "mp4",
    };
    expect(mixRequestSchema.safeParse(input).success).toBe(true);
    expect(mixRequestSchema.safeParse({ ...input, idempotencyKey: "short" }).success).toBe(false);
    expect(mixRequestSchema.safeParse({ ...input, projectId: "not-a-uuid" }).success).toBe(false);
    expect(mixRequestSchema.safeParse({ ...input, credits: 10 }).success).toBe(false);
  });

  it("limita pistas y rechaza assets o ids inválidos", () => {
    const track = {
      id: crypto.randomUUID(),
      assetId: crypto.randomUUID(),
      kind: "music",
      name: "Música",
      startMs: 0,
      trimStartMs: 0,
      durationMs: 5_000,
      volume: 0.5,
      speed: 1,
      muted: false,
    };
    const input = {
      name: "Proyecto",
      sourceVideoAssetId: null,
      durationMs: 10_000,
      preset: {},
      tracks: [track],
    };
    expect(audioProjectSchema.safeParse(input).success).toBe(true);
    expect(audioProjectSchema.safeParse({ ...input, tracks: Array(65).fill(track) }).success).toBe(false);
    expect(audioProjectSchema.safeParse({ ...input, tracks: [{ ...track, assetId: "otro" }] }).success).toBe(false);
  });

  it("valida formato, tamaño y archivos vacíos", () => {
    expect(validateMediaFile(new File(["audio"], "voz.mp3", { type: "audio/mpeg" }), "audio")).toBeNull();
    expect(validateMediaFile(new File(["x"], "voz.txt", { type: "text/plain" }), "audio")).toMatch(/Formato/);
    expect(validateMediaFile(new File([], "vacio.wav", { type: "audio/wav" }), "audio")).toMatch(/vacío/);
    const oversized = { type: "audio/mpeg", size: 50 * 1024 * 1024 + 1 } as File;
    expect(validateMediaFile(oversized, "audio")).toMatch(/50 MB/);
  });
});
