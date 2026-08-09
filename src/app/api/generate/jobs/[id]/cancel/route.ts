import { NextResponse } from "next/server";
import { getOwnedGenerationJob, requestGenerationCancellation } from "@/lib/generation/db";
import { refundGenerationJob } from "@/lib/generation/db";
import { generationErrorResponse, requireGenerationUser } from "@/lib/generation/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireGenerationUser();
    const { id } = await params;
    const job = await getOwnedGenerationJob(user.id, id);
    if (!job) return NextResponse.json({ errorCode: "JOB_NOT_FOUND", message: "Job no encontrado." }, { status: 404 });
    if (job.status === "queued") {
      await requestGenerationCancellation(id);
      await refundGenerationJob({ jobId: id, code: "CANCELED", message: "El usuario canceló el job.", canceled: true });
    } else if (job.status === "processing") {
      await requestGenerationCancellation(id);
    }
    return NextResponse.json({ jobId: id, status: "cancellation_requested" });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
