import Redis from "ioredis";

async function main() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) throw new Error("REDIS_URL no está configurado.");

  const redis = new Redis(redisUrl, {
    connectTimeout: 10_000,
    commandTimeout: 10_000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  redis.on("error", () => undefined);

  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") throw new Error("Redis no respondió PONG.");
    await assertSupabaseServiceRole();
    console.log(JSON.stringify({ ok: true, redis: "pong", supabase: "reachable" }));
  } finally {
    redis.disconnect();
  }
}

async function assertSupabaseServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRole) throw new Error("Faltan las variables de Supabase del worker.");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/generation_jobs?select=id&limit=1`, {
    headers: {
      apikey: serviceRole,
      authorization: `Bearer ${serviceRole}`,
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Supabase respondió ${response.status}.`);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Healthcheck falló." }));
  process.exitCode = 1;
});
