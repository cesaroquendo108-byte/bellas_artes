import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireGenerationUser: vi.fn(),
  persistGenerationInput: vi.fn(),
  cleanupGenerationInput: vi.fn(),
  isGenerationRouteConfigured: vi.fn(),
  resolveAudioRoute: vi.fn(),
  enqueueGeneration: vi.fn(),
  generationErrorResponse: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/lib/audio/validation", () => ({
  validateMediaFile: vi.fn(() => null),
  voiceChangerRequestSchema: { safeParse: mocks.safeParse },
}));
vi.mock("@/lib/generation/input", () => ({
  persistGenerationInput: mocks.persistGenerationInput,
  cleanupGenerationInput: mocks.cleanupGenerationInput,
}));
vi.mock("@/lib/generation/config", () => ({ isGenerationRouteConfigured: mocks.isGenerationRouteConfigured }));
vi.mock("@/lib/generation/registry", () => ({ resolveAudioRoute: mocks.resolveAudioRoute }));
vi.mock("@/lib/generation/service", () => ({
  enqueueGeneration: mocks.enqueueGeneration,
  generationErrorResponse: mocks.generationErrorResponse,
  requireGenerationUser: mocks.requireGenerationUser,
}));

import { POST } from "./route";

function request() {
  const form = new FormData();
  form.set("file", new File(["audio"], "voz.mp3", { type: "audio/mpeg" }));
  form.set("payload", JSON.stringify({ idempotencyKey: "voice-request-1", consent: true }));
  return new Request("http://localhost/api/audio/voice-changer", { method: "POST", body: form });
}

describe("POST /api/audio/voice-changer cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireGenerationUser.mockResolvedValue({ id: "user-1" });
    mocks.safeParse.mockImplementation((data: unknown) => ({ success: true, data }));
    mocks.isGenerationRouteConfigured.mockReturnValue(true);
    mocks.resolveAudioRoute.mockReturnValue({ operation: "voice-changer", publicModel: "rvc", backendModel: "rvc", providerRoute: "rvc", workflowVersion: "rvc", credits: 1 });
    mocks.persistGenerationInput.mockResolvedValue({ id: "asset-1", key: "users/user-1/inputs/audio/voice.mp3", signedUrl: "https://r2.example/input" });
    mocks.cleanupGenerationInput.mockResolvedValue(undefined);
    mocks.generationErrorResponse.mockReturnValue({ body: { errorCode: "GENERATION_UNAVAILABLE", message: "No disponible." }, status: 503 });
  });

  it("limpia el input si el enqueue falla antes de entregar el job", async () => {
    mocks.enqueueGeneration.mockRejectedValue(new Error("queue down"));

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.cleanupGenerationInput).toHaveBeenCalledWith({
      userId: "user-1",
      assetId: "asset-1",
      key: "users/user-1/inputs/audio/voice.mp3",
    });
  });

  it("limpia el input de una repetición idempotente no vinculada al job", async () => {
    mocks.enqueueGeneration.mockResolvedValue({ jobId: "job-1", kind: "audio", status: "queued", idempotent: true, creditsReserved: 0 });

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(mocks.cleanupGenerationInput).toHaveBeenCalledOnce();
  });

  it("conserva el input cuando el job nuevo fue entregado a la cola", async () => {
    mocks.enqueueGeneration.mockResolvedValue({ jobId: "job-1", kind: "audio", status: "queued", idempotent: false, creditsReserved: 1 });

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(mocks.cleanupGenerationInput).not.toHaveBeenCalled();
  });
});
