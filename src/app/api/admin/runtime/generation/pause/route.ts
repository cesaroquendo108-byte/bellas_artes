import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { pauseGenerationRuntime } from "@/lib/admin/runtime-controls";
import { requireAdminApiSession } from "@/lib/phase7/auth";

export const runtime = "nodejs";

const pauseSchema = z.object({
  reason: z.string().trim().min(8).max(500),
  confirmation: z.literal("PAUSAR GENERACION"),
}).strict();

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session.ok) {
    return NextResponse.json(
      {
        errorCode: session.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        message: session.status === 401 ? "Inicia sesión para continuar." : "Se requieren permisos de administración.",
      },
      { status: session.status, headers: privateNoStoreHeaders() },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errorCode: "INVALID_JSON", message: "El cuerpo JSON es inválido." },
      { status: 400, headers: privateNoStoreHeaders() },
    );
  }

  const parsed = pauseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "INVALID_PAUSE_REQUEST", message: "Confirma la operación y explica el motivo." },
      { status: 422, headers: privateNoStoreHeaders() },
    );
  }

  try {
    return NextResponse.json(
      { control: await pauseGenerationRuntime(session.user.id, parsed.data.reason) },
      { headers: privateNoStoreHeaders() },
    );
  } catch (error) {
    return NextResponse.json(
      {
        errorCode: "GENERATION_PAUSE_FAILED",
        message: error instanceof Error ? error.message : "No se pudo aplicar la pausa.",
      },
      { status: 503, headers: privateNoStoreHeaders() },
    );
  }
}

function privateNoStoreHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0" };
}
