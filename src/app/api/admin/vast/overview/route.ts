import { NextResponse } from "next/server";

import { privateNoStoreHeaders, requireVastAdminApiSession, vastAdminErrorResponse } from "@/lib/admin/vast-api-auth";
import { getVastAdminOverview } from "@/lib/admin/vast-service";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireVastAdminApiSession();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getVastAdminOverview(), { headers: privateNoStoreHeaders() });
  } catch (error) {
    return vastAdminErrorResponse(error, "No se pudo consultar Vast.ai.");
  }
}
