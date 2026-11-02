import { NextResponse } from "next/server";
import { buildFreefieldWorkflow, getFreefieldApp } from "@/lib/freefield/registry";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const app = getFreefieldApp(id);
  if (!app) {
    return NextResponse.json(
      { errorCode: "FREEFIELD_APP_NOT_FOUND", message: `La aplicación Freefield "${id}" no existe.` },
      { status: 404 },
    );
  }

  // Omit the raw graph in the summary GET to keep response fast and clean
  const { graph: _, ...appDetails } = app;
  void _;
  return NextResponse.json({
    app: appDetails,
    hasGraph: Boolean(app.graph),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = buildFreefieldWorkflow(id, body);

    return NextResponse.json({
      success: true,
      appId: id,
      appName: result.app.name,
      resolvedValues: result.resolvedValues,
      prompt: result.prompt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        errorCode: "FREEFIELD_BUILD_ERROR",
        message: error instanceof Error ? error.message : "Error al construir el grafo de ComfyUI.",
      },
      { status: 400 },
    );
  }
}
