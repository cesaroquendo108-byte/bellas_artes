import { Queue } from "bullmq";
import Redis from "ioredis";
import { isQueueGatewayConfigured, postQueueGateway } from "@/lib/redis-gateway/client";
import { queueGatewayPaths, type EnqueueGenerationRequest } from "@/lib/redis-gateway/contracts";
import { getGenerationConfig } from "./config";
import type { GenerationQueueKind } from "./queue-contracts";

export { generationQueueNames, type GenerationQueueKind } from "./queue-contracts";

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
  const queue = new Queue(`generation-${kind}`, {
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

export function getDeadLetterQueue(kind: GenerationQueueKind) {
  const dlqName = `dlq:${kind}`;
  const existing = queues.get(dlqName);
  if (existing) return existing;
  const queue = new Queue(`generation-${kind}-dlq`, {
    connection: getConnection(),
    prefix: process.env.BULLMQ_PREFIX ?? "bellas-artes",
  });
  queues.set(dlqName, queue);
  return queue;
}

export async function moveToDLQ(input: {
  kind: GenerationQueueKind;
  jobId: string;
  error: string;
  attempts: number;
}) {
  const dlq = getDeadLetterQueue(input.kind);
  await dlq.add("dead-letter", {
    jobId: input.jobId,
    error: input.error,
    attempts: input.attempts,
    failedAt: new Date().toISOString(),
  }, { jobId: input.jobId });
}

export async function enqueueGenerationJobDirect(input: EnqueueGenerationRequest) {
  const queue = getGenerationQueue(input.kind);
  return queue.add(input.kind, { jobId: input.jobId }, { jobId: input.jobId, priority: input.priority ?? 10 });
}

export async function enqueueGenerationJob(input: EnqueueGenerationRequest) {
  if (!isQueueGatewayConfigured()) return enqueueGenerationJobDirect(input);
  return postQueueGateway<EnqueueGenerationRequest, { id: string | null }>(queueGatewayPaths.enqueueGeneration, input);
}
