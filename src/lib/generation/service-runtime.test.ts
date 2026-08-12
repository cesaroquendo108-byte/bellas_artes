import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  reserveGenerationJob: vi.fn(),
  isGenerationEmergencyPaused: vi.fn(),
}));
vi.mock("@/lib/admin/runtime-controls", () => ({ isGenerationEmergencyPaused: mocks.isGenerationEmergencyPaused }));
vi.mock("@/utils/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./queue", () => ({ enqueueGenerationJob: vi.fn() }));
vi.mock("./config", () => ({
  isGenerationRouteConfigured: () => true,
  getGenerationConfig: () => ({ maxAttempts: 3, billingMode: "shadow" }),
}));
vi.mock("./moderation", () => ({ moderateGenerationRequest: () => Promise.resolve({ allowed: true }) }));
vi.mock("./audit", () => ({ recordModerationEvent: () => Promise.resolve() }));
vi.mock("./rate-limit", () => ({ consumeGenerationRateLimit: vi.fn(), GenerationRateLimitError: class extends Error {} }));
vi.mock("./db", () => ({
  linkGenerationAssets: vi.fn(),
  reserveGenerationJob: mocks.reserveGenerationJob,
  refundGenerationJob: vi.fn(),
  verifyOwnedAssets: vi.fn(),
}));
vi.mock("./workflow-manifests", () => ({ hasWorkflowManifest: () => false, loadWorkflowManifest: vi.fn(), validateWorkflowRequest: vi.fn() }));
vi.mock("./access", () => ({ assertGenerationAccess: vi.fn() }));

import { enqueueGeneration } from "./service";

describe("generation emergency pause", () => {
  it("detiene nuevas reservas sin poder activar la generación", async () => {
    mocks.isGenerationEmergencyPaused.mockResolvedValue(true);
    const result = enqueueGeneration({
      userId: "user-id",
      kind: "image",
      queueKind: "image",
      route: {
        publicModel: "flux-schnell",
        backendModel: "flux-schnell",
        workflowVersion: "image/flux-schnell-v1",
        providerRoute: "vast",
        credits: 1,
      },
      request: { prompt: "Prueba controlada" },
    });

    await expect(result).rejects.toMatchObject({
      code: "GENERATION_EMERGENCY_PAUSED",
      status: 503,
    });
    expect(mocks.reserveGenerationJob).not.toHaveBeenCalled();
  });
});
