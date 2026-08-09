import { Queue } from "bullmq";
import Redis from "ioredis";
import { getGenerationConfig } from "./config";

export const generationQueueNames = ["image", "video", "audio", "character", "world"] as const;
export type GenerationQueueKind = (typeof generationQueueNames)[number];

let connection: Redis | null = null;
const queues = new Map<string, Queue>();

function getConnection() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("REDIS_URL no está configurado.");
  connection ??= new Redis(url);
  return connection;
}

export function getGenerationQueue(kind: GenerationQueueKind) {
  const existing = queues.get(kind);
  if (existing) return existing;
  const queue = new Queue(`generation:${kind}`, {
    connection: getConnection(),
    prefix: process.env.BULLMQ_PREFIX ?? "bellas-artes",
    defaultJobOptions: {
      attempts: getGenerationConfig().maxAttempts,
      backoff: { type: "exponential", delay: 5000, jitter: 0.25 },
      removeOnComplete: { age: 86_400, count: 1000 },
      removeOnFail: { age: 604_800, count: 5000 },
    },
  });
  queues.set(kind, queue);
  return queue;
}

export async function enqueueGenerationJob(input: {
  kind: GenerationQueueKind;
  jobId: string;
  priority?: number;
}) {
  const queue = getGenerationQueue(input.kind);
  return queue.add(input.kind, { jobId: input.jobId }, { jobId: input.jobId, priority: input.priority ?? 10 });
}
