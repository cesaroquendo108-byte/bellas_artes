import { NextResponse } from "next/server";
import { getGenerationOutputAssetIds, getOwnedGenerationJob, requestGenerationCancellation, type GenerationJobRecord } from "@/lib/generation/db";
import { enqueueGenerationJob } from "@/lib/generation/queue";
import { generationErrorResponse, requireGenerationUser } from "@/lib/generation/service";
import { createAdminClient } from "@/utils/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

async function responseForJob(job: GenerationJobRecord) {
  const outputAssetIds = await getGenerationOutputAssetIds(job.id);
  return {
    jobId: job.id,
    kind: job.kind,
    operation: job.operation,
    status: job.status,
    creditsReserved: Number(job.credits_reserved ?? 0),
    outputAssetIds,
    errorCode: job.error_code,
    message: job.error_message,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireGenerationUser();
    const { id } = await params;
    const job = await getOwnedGenerationJob(user.id, id);
    if (!job) return NextResponse.json({ errorCode: "JOB_NOT_FOUND", message: "Job no encontrado." }, { status: 404 });
    return NextResponse.json(await responseForJob(job));
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireGenerationUser();
    const { id } = await params;
    const job = await getOwnedGenerationJob(user.id, id);
    if (!job) return NextResponse.json({ errorCode: "JOB_NOT_FOUND", message: "Job no encontrado." }, { status: 404 });
    if (job.status === "queued") {
      await requestGenerationCancellation(id);
      await createAdminClient().rpc("refund_generation_credits", { p_job_id: id, p_error_code: "CANCELED", p_error_message: "El usuario canceló el job.", p_canceled: true });
    } else if (job.status === "processing") {
      await requestGenerationCancellation(id);
    }
    return NextResponse.json({ jobId: id, status: "cancellation_requested" });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireGenerationUser();
    const { id } = await params;
    const job = await getOwnedGenerationJob(user.id, id);
    if (!job) return NextResponse.json({ errorCode: "JOB_NOT_FOUND", message: "Job no encontrado." }, { status: 404 });
    if (!["failed", "canceled"].includes(job.status)) return NextResponse.json({ errorCode: "JOB_NOT_RETRYABLE", message: "El job todavía no puede reintentarse." }, { status: 409 });
    const { data, error } = await createAdminClient().rpc("retry_generation_job", { p_job_id: id });
    if (error) return NextResponse.json({ errorCode: "RETRY_FAILED", message: error.message }, { status: 422 });
    await enqueueGenerationJob({ kind: job.kind as "image" | "video" | "audio" | "character" | "world", jobId: id });
    return NextResponse.json({ jobId: id, status: "queued", creditsReserved: Number((data as { reserved_credits?: number })?.reserved_credits ?? 0) }, { status: 202 });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
