import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ add: vi.fn() }));

vi.mock("bullmq", () => ({
  Queue: class {
    add = mocks.add;
  },
}));

vi.mock("ioredis", () => ({
  default: class {},
}));

import { scheduleVastLeaseDestruction } from "./vast-lifecycle-queue";

describe("cola de ciclo de vida Vast", () => {
  beforeEach(() => {
    vi.stubEnv("REDIS_URL", "rediss://example.invalid:6379");
    mocks.add.mockReset().mockResolvedValue({ id: "job" });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("usa un jobId compatible con BullMQ y conserva el UUID", async () => {
    const leaseId = "11111111-1111-4111-8111-111111111111";
    await scheduleVastLeaseDestruction(leaseId, new Date(Date.now() + 60_000).toISOString());
    expect(mocks.add).toHaveBeenCalledWith(
      "destroy-lease",
      { leaseId },
      expect.objectContaining({ jobId: `destroy-${leaseId}` }),
    );
    expect(mocks.add.mock.calls[0][2].jobId).not.toContain(":");
  });
});
