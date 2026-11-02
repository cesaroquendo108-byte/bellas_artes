import { NextResponse } from "next/server";
import { executeFreefieldApp } from "@/lib/freefield/executor";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as {
      inputs?: Record<string, unknown>;
      comfyUrl?: string;
      dryRun?: boolean;
      timeoutSeconds?: number;
    };

    const inputs = body.inputs || body;
    const result = await executeFreefieldApp(id, inputs, {
      comfyUrl: body.comfyUrl,
      dryRun: Boolean(body.dryRun),
      timeoutSeconds: body.timeoutSeconds,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error durante la ejecución del workflow.";
    const isNotFound = message.includes("no existe");
    return NextResponse.json(
      {
        success: false,
        errorCode: isNotFound ? "FREEFIELD_APP_NOT_FOUND" : "FREEFIELD_EXECUTION_ERROR",
        message,
      },
      { status: isNotFound ? 404 : 400 },
    );
  }
}
