import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminAccessFilters, adminPlanTiers, adminUserRoles } from "@/lib/admin/user-contracts";
import { listAdminUsers } from "@/lib/admin/users";
import { requireAdminApiSession } from "@/lib/phase7/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  search: z.string().trim().max(120).default(""),
  role: z.enum(["all", ...adminUserRoles]).default("all"),
  plan: z.enum(["all", ...adminPlanTiers]).default("all"),
  access: z.enum(adminAccessFilters).default("all"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session.ok) return unauthorized(session.status);

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "INVALID_USER_QUERY", message: "Revisa los filtros de usuarios." },
      { status: 422, headers: privateNoStoreHeaders() },
    );
  }

  try {
    return NextResponse.json(await listAdminUsers(parsed.data), { headers: privateNoStoreHeaders() });
  } catch (error) {
    return NextResponse.json(
      { errorCode: "ADMIN_USERS_UNAVAILABLE", message: safeMessage(error, "No se pudieron cargar los usuarios.") },
      { status: 503, headers: privateNoStoreHeaders() },
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
