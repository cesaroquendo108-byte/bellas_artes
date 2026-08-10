import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Redis from "ioredis";
import { Queue, Worker, type Job } from "bullmq";

const REDIS_URL = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
const BASE_PREFIX = process.env.BULLMQ_PREFIX ?? "bellas-artes";
const PREFIX = `${BASE_PREFIX}:e2e:${Date.now()}`;

async function run() {
  console.log("🚀 Iniciando pruebas E2E aisladas: Redis + BullMQ + DLQ\n");

  // 1. Conectar a Redis
  console.log("--- 1. Conectando a Redis ---");
  const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  const pong = await connection.ping();
  console.log(`✅ Redis respondió: ${pong}`);

  // 2. Crear cola de generación
  console.log("\n--- 2. Creando cola BullMQ 'generation:image' ---");
  const queue = new Queue("generation-image", {
    connection,
    prefix: PREFIX,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 60, count: 10 },
      removeOnFail: { age: 60, count: 10 },
    },
  });

  // 3. Crear cola DLQ
  console.log("--- 3. Creando cola DLQ 'generation-image-dlq' ---");
  const dlqQueue = new Queue("generation-image-dlq", { connection, prefix: PREFIX });
  const cancellationQueue = new Queue("generation-cancellation", { connection, prefix: PREFIX });

  // 4. Encolar un job de prueba exitoso
  console.log("\n--- 4. Encolando job exitoso ---");
  const successJobId = `test-success-${Date.now()}`;
  await queue.add("image", { jobId: successJobId }, { jobId: successJobId });
  console.log(`✅ Job encolado: ${successJobId}`);

  // 5. Crear worker que procese el job
  let successProcessed = false;
  let failJobDLQd = false;

  const worker = new Worker<{ jobId: string }>("generation-image", async (job: Job<{ jobId: string }>) => {
    if (job.data.jobId.startsWith("test-success")) {
      console.log(`  ✅ Worker procesó job exitoso: ${job.data.jobId}`);
      successProcessed = true;
      return;
    }
    if (job.data.jobId.startsWith("test-fail")) {
      console.log(`  ⚠️  Worker falló intencionalmente (attempt ${job.attemptsMade + 1}/3): ${job.data.jobId}`);
      throw new Error("FALLO_INTENCIONAL");
    }
  }, { connection, prefix: PREFIX, concurrency: 1 });

  // DLQ listener
  worker.on("failed", async (job, error) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
      console.log(`  🔴 Job agotó reintentos, moviendo a DLQ: ${job.data.jobId}`);
      await dlqQueue.add("dead-letter", {
        jobId: job.data.jobId,
        error: error.message,
        attempts: job.attemptsMade,
        failedAt: new Date().toISOString(),
      });
      failJobDLQd = true;
    }
  });

  // Esperar a que se procese el job exitoso
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 6. Encolar un job que fallará 3 veces
  console.log("\n--- 6. Encolando job que fallará 3 veces ---");
  const failJobId = `test-fail-${Date.now()}`;
  await queue.add("image", { jobId: failJobId }, {
    jobId: failJobId,
    attempts: 3,
    backoff: { type: "fixed", delay: 500 },
  });
  console.log(`✅ Job encolado: ${failJobId}`);

  // Esperar a que falle 3 veces y se mueva a DLQ
  console.log("   Esperando reintentos (3x500ms backoff)...");
  await new Promise(resolve => setTimeout(resolve, 6000));

  // 7. Verificar DLQ
  console.log("\n--- 7. Verificando DLQ ---");
  const dlqJobs = await dlqQueue.getJobs(["waiting", "active", "completed", "delayed"]);
  const dlqMatch = dlqJobs.find(j => j.data.jobId === failJobId);

  // 8. Verificar cancelación
  console.log("\n--- 8. Probando cancelación ---");
  const cancelJobId = `test-cancel-${Date.now()}`;
  const cancelJob = await cancellationQueue.add("image", { jobId: cancelJobId }, { jobId: cancelJobId });
  await cancelJob.remove();
  const cancelledJob = await cancellationQueue.getJob(cancelJobId);
  const cancellationPassed = cancelledJob === undefined;
  console.log(cancellationPassed
    ? `✅ Job cancelado/removido exitosamente: ${cancelJobId}`
    : `❌ El job cancelado todavía existe: ${cancelJobId}`
  );

  // 9. Resumen
  console.log("\n═══════════════════════════════════════════");
  console.log("  RESUMEN DE PRUEBAS");
  console.log("═══════════════════════════════════════════");
  console.log(`  Redis PING:           ${pong === "PONG" ? "✅ OK" : "❌ FAIL"}`);
  console.log(`  Job exitoso procesado: ${successProcessed ? "✅ OK" : "❌ FAIL"}`);
  console.log(`  Job falló → DLQ:      ${dlqMatch ? "✅ OK" : failJobDLQd ? "✅ OK (listener)" : "❌ FAIL"}`);
  console.log(`  Cancelación:          ${cancellationPassed ? "✅ OK" : "❌ FAIL"}`);
  console.log("═══════════════════════════════════════════");

  const allPassed = pong === "PONG" && successProcessed && (!!dlqMatch || failJobDLQd) && cancellationPassed;
  console.log(allPassed
    ? "\n🎉 TODAS LAS PRUEBAS E2E (Redis, BullMQ, DLQ, Cancelación) FUERON EXITOSAS."
    : "\n❌ Algunas pruebas fallaron. Revisa los detalles arriba."
  );

  // Cleanup
  await worker.close();
  await queue.obliterate({ force: true });
  await dlqQueue.obliterate({ force: true });
  await cancellationQueue.obliterate({ force: true });
  connection.disconnect();
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
