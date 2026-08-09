import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getAudioProvider: vi.fn(() => ({ state: "provider_unconfigured" })),
  getAudioProviderStatus: vi.fn(() => ({
    state: "provider_unconfigured",
    provider: "disabled",
    credentialsPresent: false,
    message: "La generación de audio está deshabilitada.",
  })),
  from: vi.fn(),
  getProject: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from })),
}));

vi.mock("@/lib/audio/provider", () => ({
  getAudioProvider: mocks.getAudioProvider,
  getAudioProviderStatus: mocks.getAudioProviderStatus,
}));

import { POST as mixAudio } from "@/app/api/audio/mix/route";
import { POST as createTts } from "@/app/api/audio/tts/route";
import { POST as changeVoice } from "@/app/api/audio/voice-changer/route";

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

const voice = {
  idempotencyKey: "request-1234",
  voiceId: "es-warm-narrator",
  pitch: 0,
  speed: 1,
  intensity: 0.7,
  preserveEmotion: true,
  consent: true,
};

describe("Audio API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.getProject.mockResolvedValue({ data: { id: "project-1" }, error: null });
    mocks.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: mocks.getProject })),
        })),
      })),
    }));
  });

  it("rechaza usuarios no autenticados", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await createTts(
      new Request("http://localhost/api/audio/tts", {
        method: "POST",
        body: JSON.stringify(tts),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("distingue JSON inválido de contrato TTS inválido", async () => {
    const invalidJson = await createTts(
      new Request("http://localhost/api/audio/tts", { method: "POST", body: "{" }),
    );
    expect(invalidJson.status).toBe(400);

    const invalidContract = await createTts(
      new Request("http://localhost/api/audio/tts", {
        method: "POST",
        body: JSON.stringify({ ...tts, userId: "otro" }),
      }),
    );
    expect(invalidContract.status).toBe(422);
  });

  it("devuelve not_configured sin reservar créditos para TTS", async () => {
    const response = await createTts(
      new Request("http://localhost/api/audio/tts", {
        method: "POST",
        body: JSON.stringify(tts),
      }),
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      jobId: null,
      kind: "tts",
      status: "not_configured",
      creditsReserved: 0,
      errorCode: "AUDIO_PROVIDER_NOT_CONFIGURED",
    });
  });

  it("rechaza Voice Changer sin archivo, payload roto y consentimiento ausente", async () => {
    const noFile = new FormData();
    noFile.set("payload", JSON.stringify(voice));
    expect(
      (await changeVoice(new Request("http://localhost/api/audio/voice-changer", { method: "POST", body: noFile }))).status,
    ).toBe(422);

    const brokenPayload = new FormData();
    brokenPayload.set("file", new File(["audio"], "voz.mp3", { type: "audio/mpeg" }));
    brokenPayload.set("payload", "{");
    expect(
      (await changeVoice(new Request("http://localhost/api/audio/voice-changer", { method: "POST", body: brokenPayload }))).status,
    ).toBe(400);

    const missingConsent = new FormData();
    missingConsent.set("file", new File(["audio"], "voz.mp3", { type: "audio/mpeg" }));
    missingConsent.set("payload", JSON.stringify({ ...voice, consent: false }));
    expect(
      (await changeVoice(new Request("http://localhost/api/audio/voice-changer", { method: "POST", body: missingConsent }))).status,
    ).toBe(422);
  });

  it("rechaza MIME inválido y declara proveedor ausente en Voice Changer", async () => {
    const invalid = new FormData();
    invalid.set("file", new File(["texto"], "voz.txt", { type: "text/plain" }));
    invalid.set("payload", JSON.stringify(voice));
    expect(
      (await changeVoice(new Request("http://localhost/api/audio/voice-changer", { method: "POST", body: invalid }))).status,
    ).toBe(422);

    const valid = new FormData();
    valid.set("file", new File(["audio"], "voz.mp3", { type: "audio/mpeg" }));
    valid.set("payload", JSON.stringify(voice));
    const response = await changeVoice(
      new Request("http://localhost/api/audio/voice-changer", { method: "POST", body: valid }),
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      jobId: null,
      kind: "voice_changer",
      status: "not_configured",
      creditsReserved: 0,
    });
  });

  it("valida mezcla y no crea un job sin proveedor", async () => {
    const malformed = await mixAudio(
      new Request("http://localhost/api/audio/mix", { method: "POST", body: "{" }),
    );
    expect(malformed.status).toBe(400);

    const payload = {
      idempotencyKey: "request-1234",
      projectId: crypto.randomUUID(),
      format: "mp4",
    };
    const unknownField = await mixAudio(
      new Request("http://localhost/api/audio/mix", {
        method: "POST",
        body: JSON.stringify({ ...payload, ownerId: "otro" }),
      }),
    );
    expect(unknownField.status).toBe(422);

    const response = await mixAudio(
      new Request("http://localhost/api/audio/mix", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      jobId: null,
      kind: "video_mix",
      status: "not_configured",
      creditsReserved: 0,
    });
  });

  it("rechaza mezclar un proyecto que no pertenece al usuario", async () => {
    mocks.getProject.mockResolvedValue({ data: null, error: null });
    const response = await mixAudio(
      new Request("http://localhost/api/audio/mix", {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: "request-1234", projectId: crypto.randomUUID(), format: "mp4" }),
      }),
    );
    expect(response.status).toBe(404);
    expect(mocks.getAudioProvider).not.toHaveBeenCalled();
  });
});
