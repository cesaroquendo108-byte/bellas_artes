import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getVastAdminServerConfig, isVastAdminOperator, VastAdminError } from "@/lib/admin/vast-client";
import { requireAdminApiSession } from "@/lib/phase7/auth";

export async function requireVastAdminApiSession() {
  const session = await requireAdminApiSession();
  if (!session.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({
        errorCode: session.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        message: session.status === 401 ? "Inicia sesión para continuar." : "Se requieren permisos de administración.",
      }, { status: session.status, headers: privateNoStoreHeaders() }),
    };
  }
  if (!isVastAdminOperator(session.user.email, getVastAdminServerConfig())) {
    return {
      ok: false as const,
      response: NextResponse.json({
        errorCode: "VAST_OPERATOR_FORBIDDEN",
        message: "Esta cuenta no está autorizada para alquilar GPUs.",
      }, { status: 403, headers: privateNoStoreHeaders() }),
    };
  }
  return { ok: true as const, session };
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) throw new VastAdminError("INVALID_ORIGIN", "La operación debe iniciarse desde Bellas Artes.", 403);
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new VastAdminError("INVALID_ORIGIN", "El origen de la operación es inválido.", 403);
  }
  if (parsed.origin !== request.nextUrl.origin) {
    throw new VastAdminError("INVALID_ORIGIN", "El origen de la operación no está autorizado.", 403);
  }
}

export function vastAdminErrorResponse(error: unknown, fallback: string) {
  if (error instanceof VastAdminError) {
    return NextResponse.json({ errorCode: error.code, message: error.message }, {
      status: error.status,
      headers: privateNoStoreHeaders(),
    });
  }
  return NextResponse.json({ errorCode: "VAST_ADMIN_ERROR", message: fallback }, {
    status: 503,
    headers: privateNoStoreHeaders(),
  });
}

export function privateNoStoreHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0" };
}
