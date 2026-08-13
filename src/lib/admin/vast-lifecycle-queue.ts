import "server-only";

import { Queue } from "bullmq";
import Redis from "ioredis";

export const vastLifecycleQueueName = "vast-admin-lifecycle";

let connection: Redis | null = null;
let queue: Queue<{ leaseId: string }> | null = null;

function getConnection() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("REDIS_URL no está configurado para el ciclo de vida Vast.");
  connection ??= new Redis(url, { maxRetriesPerRequest: null });
  return connection;
}

export function getVastLifecycleQueue() {
  queue ??= new Queue<{ leaseId: string }>(vastLifecycleQueueName, {
    connection: getConnection(),
    prefix: process.env.BULLMQ_PREFIX ?? "bellas-artes",
    defaultJobOptions: {
      attempts: 8,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 500 },
      removeOnFail: { age: 604_800, count: 2_000 },
    },
  });
  return queue;
}

export async function scheduleVastLeaseDestruction(leaseId: string, expiresAt: string) {
  const delay = Math.max(Date.parse(expiresAt) - Date.now(), 0);
  return getVastLifecycleQueue().add("destroy-lease", { leaseId }, {
    jobId: `destroy-${leaseId}`,
    delay,
  });
}
