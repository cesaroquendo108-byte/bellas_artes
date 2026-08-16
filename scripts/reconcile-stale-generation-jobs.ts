import { createClient } from "@supabase/supabase-js";

const APPLY_CONFIRMATION = "REFUNDAR JOBS REDIS";
const DEFAULT_OLDER_THAN_HOURS = 24;

type StaleJob = {
  id: string;
  status: "queued" | "processing";
  created_at: string;
  credits_reserved: number;
  credits_refunded: number;
};

async function main() {
  const options = readOptions(process.argv.slice(2));
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const cutoff = new Date(Date.now() - options.olderThanHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("generation_jobs")
    .select("id,status,created_at,credits_reserved,credits_refunded")
    .in("status", ["queued", "processing"])
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron consultar los jobs: ${error.message}`);

  const stale = (data ?? []) as StaleJob[];
  const queued = stale.filter((job) => job.status === "queued" && job.credits_refunded === 0);
  const processing = stale.filter((job) => job.status === "processing");
  const credits = queued.reduce((sum, job) => sum + job.credits_reserved, 0);

  console.log(`Corte: ${cutoff}`);
  console.log(`Jobs queued elegibles: ${queued.length}`);
  console.log(`Créditos reservados a reembolsar: ${credits}`);
  console.log(`Jobs processing excluidos para revisión manual: ${processing.length}`);

  if (!options.apply) {
    console.log(`Dry-run. Para aplicar use --apply --confirmation="${APPLY_CONFIRMATION}".`);
    return;
  }
  if (options.confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`Confirmación inválida. Se esperaba exactamente: ${APPLY_CONFIRMATION}`);
  }
  if (processing.length) {
    throw new Error("Hay jobs processing antiguos. No se aplicaron cambios; revíselos manualmente.");
  }

  let refundedJobs = 0;
  let refundedCredits = 0;
  for (const job of queued) {
    const { data: current, error: currentError } = await admin
      .from("generation_jobs")
      .select("status,credits_refunded")
      .eq("id", job.id)
      .single();
    if (currentError) throw new Error(`No se pudo revalidar un job: ${currentError.message}`);
    if (current.status !== "queued" || Number(current.credits_refunded) > 0) continue;

    const { error: refundError } = await admin.rpc("refund_generation_credits", {
      p_job_id: job.id,
      p_error_code: "REDIS_MIGRATION_STALE_JOB",
      p_error_message: "Job cancelado al migrar la cola de Upstash a Redis privado.",
      p_canceled: true,
    });
    if (refundError) throw new Error(`Falló un reembolso: ${refundError.message}`);
    refundedJobs += 1;
    refundedCredits += job.credits_reserved;
  }

  console.log(`Reconciliación aplicada: ${refundedJobs} jobs, ${refundedCredits} créditos.`);
}

function readOptions(args: string[]) {
  const apply = args.includes("--apply");
  const confirmation = valueFor(args, "--confirmation");
  const hoursValue = valueFor(args, "--older-than-hours");
  const olderThanHours = hoursValue === undefined ? DEFAULT_OLDER_THAN_HOURS : Number(hoursValue);
  if (!Number.isFinite(olderThanHours) || olderThanHours < 1) {
    throw new Error("--older-than-hours debe ser un número mayor o igual a 1.");
  }
  return { apply, confirmation, olderThanHours };
}

function valueFor(args: string[], name: string) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} no está configurado.`);
  return value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "La reconciliación falló.");
  process.exitCode = 1;
});
