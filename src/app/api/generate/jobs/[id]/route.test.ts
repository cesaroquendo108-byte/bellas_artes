import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireGenerationUser: vi.fn(),
  generationErrorResponse: vi.fn(),
  getGenerationOutputAssetIds: vi.fn(),
  getOwnedGenerationJob: vi.fn(),
  refundGenerationJob: vi.fn(),
  requestGenerationCancellation: vi.fn(),
  enqueueGenerationJob: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/generation/db", () => ({
  getGenerationOutputAssetIds: mocks.getGenerationOutputAssetIds,
  getOwnedGenerationJob: mocks.getOwnedGenerationJob,
  refundGenerationJob: mocks.refundGenerationJob,
  requestGenerationCancellation: mocks.requestGenerationCancellation,
}));
vi.mock("@/lib/generation/queue", () => ({ enqueueGenerationJob: mocks.enqueueGenerationJob }));
vi.mock("@/lib/generation/service", () => ({
  generationErrorResponse: mocks.generationErrorResponse,
  requireGenerationUser: mocks.requireGenerationUser,
}));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })) }));

import { PATCH, POST as cancelOrRetryPost } from "./route";
import { POST as retryPost } from "./retry/route";

const context = { params: Promise.resolve({ id: "job-1" }) };

describe("generation job financial failure paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireGenerationUser.mockResolvedValue({ id: "user-1" });
    mocks.getOwnedGenerationJob.mockResolvedValue({ id: "job-1", user_id: "user-1", kind: "image", status: "queued" });
    mocks.requestGenerationCancellation.mockResolvedValue(undefined);
    mocks.refundGenerationJob.mockResolvedValue(undefined);
    mocks.rpc.mockResolvedValue({ data: { status: "queued", reserved_credits: 2 }, error: null });
    mocks.generationErrorResponse.mockReturnValue({ body: { errorCode: "GENERATION_UNAVAILABLE", message: "No disponible." }, status: 503 });
  });

  it("no devuelve éxito si falla el reembolso de una cancelación", async () => {
    mocks.refundGenerationJob.mockRejectedValue(new Error("refund unavailable"));

    const response = await cancelOrRetryPost(new Request("http://localhost/api/generate/jobs/job-1", { method: "POST" }), context);

    expect(response.status).toBe(503);
    expect(mocks.refundGenerationJob).toHaveBeenCalledWith({
      jobId: "job-1",
      code: "CANCELED",
      message: "El usuario canceló el job.",
      canceled: true,
    });
  });

  it.each([
    ["PATCH /api/generate/jobs/[id]", PATCH],
    ["POST /api/generate/jobs/[id]/retry", retryPost],
  ])("reembolsa si la cola falla después de reservar en %s", async (_label, handler) => {
    mocks.getOwnedGenerationJob.mockResolvedValue({ id: "job-1", user_id: "user-1", kind: "image", status: "failed" });
    mocks.enqueueGenerationJob.mockRejectedValue(new Error("redis unavailable"));

    const response = await handler(new Request("http://localhost/api/generate/jobs/job-1", { method: "POST" }), context);

    expect(response.status).toBe(503);
    expect(mocks.refundGenerationJob).toHaveBeenCalledWith(expect.objectContaining({
      jobId: "job-1",
      code: "QUEUE_UNAVAILABLE",
    }));
  });
});
