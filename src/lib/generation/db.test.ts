import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminClient } from "@/utils/supabase/admin";
import { reserveGenerationJob } from "./db";

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const mockedCreateAdminClient = vi.mocked(createAdminClient);

describe("reserveGenerationJob", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("compensa una reserva si falla la persistencia de billing", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: { job_id: "job-1", status: "queued", reserved_credits: 12 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "metadata unavailable" },
      })
      .mockResolvedValueOnce({ data: { success: true }, error: null });
    mockedCreateAdminClient.mockReturnValue({ rpc } as never);

    await expect(reserveGenerationJob({
      userId: "user-1",
      idempotencyKey: "idempotency-1",
      kind: "image",
      route: {
        publicModel: "flux-schnell",
        backendModel: "flux-schnell",
        providerRoute: "vast",
        workflowVersion: "image/flux-schnell-v1",
        credits: 12,
      },
      request: { prompt: "test" },
      maxAttempts: 3,
      billingMode: "live",
    })).rejects.toThrow("metadata unavailable");

    expect(rpc).toHaveBeenNthCalledWith(3, "refund_generation_credits", {
      p_job_id: "job-1",
      p_error_code: "BILLING_METADATA_FAILED",
      p_error_message: "No se pudo persistir la configuración de billing del job.",
      p_canceled: false,
    });
  });
});
