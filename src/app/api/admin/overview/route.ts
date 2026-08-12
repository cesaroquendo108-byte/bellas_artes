import { NextRequest, NextResponse } from "next/server";

import { parseAdminDashboardWindow } from "@/lib/admin/contracts";
import { getAdminDashboardSnapshot } from "@/lib/admin/dashboard";
import { requireAdminApiSession } from "@/lib/phase7/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

  try {
    const window = parseAdminDashboardWindow(request.nextUrl.searchParams.get("window"));
    return NextResponse.json(await getAdminDashboardSnapshot(window), {
      headers: privateNoStoreHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        errorCode: "ADMIN_DASHBOARD_UNAVAILABLE",
        message: error instanceof Error ? error.message : "No se pudo actualizar el Dashboard.",
      },
      { status: 503, headers: privateNoStoreHeaders() },
    );
  }
}

function privateNoStoreHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0" };
}
