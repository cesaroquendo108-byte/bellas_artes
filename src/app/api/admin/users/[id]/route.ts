import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AdminUserNotFoundError, getAdminUserDetail } from "@/lib/admin/users";
import { requireAdminApiSession } from "@/lib/phase7/auth";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApiSession();
  if (!session.ok) return unauthorized(session.status);

  const id = z.string().uuid().safeParse((await context.params).id);
  if (!id.success) {
    return NextResponse.json(
      { errorCode: "INVALID_USER_ID", message: "El identificador de usuario no es válido." },
      { status: 422, headers: privateNoStoreHeaders() },
    );
  }

  try {
    return NextResponse.json({ user: await getAdminUserDetail(id.data) }, { headers: privateNoStoreHeaders() });
  } catch (error) {
    const notFound = error instanceof AdminUserNotFoundError;
    return NextResponse.json(
      {
        errorCode: notFound ? "USER_NOT_FOUND" : "ADMIN_USER_UNAVAILABLE",
        message: notFound ? error.message : safeMessage(error, "No se pudo cargar el usuario."),
      },
      { status: notFound ? 404 : 503, headers: privateNoStoreHeaders() },
    );
  }
}

function unauthorized(status: 401 | 403) {
  return NextResponse.json(
    {
      errorCode: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      message: status === 401 ? "Inicia sesión para continuar." : "Se requieren permisos de administración.",
    },
    { status, headers: privateNoStoreHeaders() },
  );
}

function safeMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function privateNoStoreHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0" };
}
