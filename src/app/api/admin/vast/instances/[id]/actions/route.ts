import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { privateNoStoreHeaders, requireSameOrigin, requireVastAdminApiSession, vastAdminErrorResponse } from "@/lib/admin/vast-api-auth";
import { actOnVastAdminInstance } from "@/lib/admin/vast-service";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["start", "stop", "destroy"]),
  confirmation: z.string().trim().min(8).max(80),
}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireVastAdminApiSession();
  if (!auth.ok) return auth.response;
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    const instanceId = Number(id);
    const parsed = schema.safeParse(await request.json());
    if (!Number.isInteger(instanceId) || instanceId <= 0 || !parsed.success) {
      return NextResponse.json({ errorCode: "INVALID_VAST_ACTION", message: "La acción o la instancia no es válida." }, {
        status: 422,
        headers: privateNoStoreHeaders(),
      });
    }
    const lease = await actOnVastAdminInstance({
      instanceId,
      action: parsed.data.action,
      confirmation: parsed.data.confirmation,
      operatorId: auth.session.user.id,
    });
    return NextResponse.json({ lease }, { headers: privateNoStoreHeaders() });
  } catch (error) {
    return vastAdminErrorResponse(error, "No se pudo modificar la instancia Vast.ai.");
  }
}
