import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminUserRoles } from "@/lib/admin/user-contracts";
import { updateAdminUserRole } from "@/lib/admin/users";
import { requireAdminApiSession } from "@/lib/phase7/auth";

export const runtime = "nodejs";

const roleSchema = z.object({
  role: z.enum(adminUserRoles),
  confirmation: z.literal("CAMBIAR ROL"),
  reason: z.string().trim().min(8).max(500),
}).strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApiSession();
  if (!session.ok) return unauthorized(session.status);

  const id = z.string().uuid().safeParse((await context.params).id);
  if (!id.success) return invalid("INVALID_USER_ID", "El identificador de usuario no es válido.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid("INVALID_JSON", "El cuerpo JSON es inválido.", 400);
  }
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return invalid("INVALID_ROLE_REQUEST", "Confirma la operación y explica el motivo.");

  try {
    const role = await updateAdminUserRole(session.user.id, id.data, parsed.data);
    return NextResponse.json({ role }, { headers: privateNoStoreHeaders() });
  } catch (error) {
    const message = safeMessage(error, "No se pudo actualizar el rol.");
    const notFound = message.includes("usuario no existe");
    const conflict = message.includes("ultimo administrador");
    return NextResponse.json(
      { errorCode: notFound ? "USER_NOT_FOUND" : conflict ? "LAST_ADMIN_PROTECTED" : "ROLE_UPDATE_FAILED", message },
      { status: notFound ? 404 : conflict ? 409 : 503, headers: privateNoStoreHeaders() },
    );
  }
}

function invalid(errorCode: string, message: string, status = 422) {
  return NextResponse.json({ errorCode, message }, { status, headers: privateNoStoreHeaders() });
}

function unauthorized(status: 401 | 403) {
  return NextResponse.json(
    { errorCode: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: status === 401 ? "Inicia sesión para continuar." : "Se requieren permisos de administración." },
    { status, headers: privateNoStoreHeaders() },
  );
}

function safeMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function privateNoStoreHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0" };
}
