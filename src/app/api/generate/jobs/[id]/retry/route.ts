import { NextResponse } from "next/server";
import { getOwnedGenerationJob, refundGenerationJob } from "@/lib/generation/db";
import { enqueueGenerationJob } from "@/lib/generation/queue";
import { generationErrorResponse, requireGenerationUser } from "@/lib/generation/service";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireGenerationUser();
    const { id } = await params;
    const job = await getOwnedGenerationJob(user.id, id);
    if (!job) return NextResponse.json({ errorCode: "JOB_NOT_FOUND", message: "Job no encontrado." }, { status: 404 });
    if (!["failed", "canceled"].includes(job.status)) return NextResponse.json({ errorCode: "JOB_NOT_RETRYABLE", message: "El job todavía no puede reintentarse." }, { status: 409 });
    const { data, error } = await createAdminClient().rpc("retry_generation_job", { p_job_id: id });
    if (error || !data) return NextResponse.json({ errorCode: "RETRY_FAILED", message: "No se pudo preparar el reintento." }, { status: 503 });
    try {
      await enqueueGenerationJob({ kind: job.kind, jobId: id });
    } catch (queueError) {
      await refundGenerationJob({ jobId: id, code: "QUEUE_UNAVAILABLE", message: queueError instanceof Error ? queueError.message : "No se pudo encolar el reintento." }).catch(() => undefined);
      throw queueError;
    }
    return NextResponse.json({ jobId: id, status: "queued", creditsReserved: Number((data as { reserved_credits?: number })?.reserved_credits ?? 0) }, { status: 202 });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
