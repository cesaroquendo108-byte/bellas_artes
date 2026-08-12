import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generationAccessLevels } from "@/lib/admin/user-contracts";
import { updateAdminUserAccess } from "@/lib/admin/users";
import { generationQueueNames } from "@/lib/generation/queue-contracts";
import { requireAdminApiSession } from "@/lib/phase7/auth";

export const runtime = "nodejs";

const accessSchema = z.object({
  accessLevel: z.enum(generationAccessLevels),
  allowedKinds: z.array(z.enum(generationQueueNames)).min(1).max(generationQueueNames.length),
  enabled: z.boolean(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  reason: z.string().trim().min(8).max(500),
}).strict().superRefine((value, context) => {
  if (value.enabled && value.expiresAt && Date.parse(value.expiresAt) <= Date.now()) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "La expiración debe estar en el futuro." });
  }
});

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
  const parsed = accessSchema.safeParse(body);
  if (!parsed.success) return invalid("INVALID_ACCESS_REQUEST", "Revisa el nivel, las modalidades y el motivo.");

  try {
    const access = await updateAdminUserAccess(session.user.id, id.data, parsed.data);
    return NextResponse.json({ access }, { headers: privateNoStoreHeaders() });
  } catch (error) {
    const message = safeMessage(error, "No se pudo actualizar el acceso.");
    const notFound = message.includes("usuario no existe");
    return NextResponse.json(
      { errorCode: notFound ? "USER_NOT_FOUND" : "ACCESS_UPDATE_FAILED", message },
      { status: notFound ? 404 : 503, headers: privateNoStoreHeaders() },
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
