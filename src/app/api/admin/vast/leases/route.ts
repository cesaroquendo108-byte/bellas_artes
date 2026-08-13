import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { privateNoStoreHeaders, requireSameOrigin, requireVastAdminApiSession, vastAdminErrorResponse } from "@/lib/admin/vast-api-auth";
import { vastAdminMarkets, vastAdminPresets } from "@/lib/admin/vast-contracts";
import { createVastAdminLease } from "@/lib/admin/vast-service";

export const runtime = "nodejs";

const schema = z.object({
  requestId: z.string().uuid(),
  offerId: z.number().int().positive(),
  preset: z.enum(vastAdminPresets),
  market: z.enum(vastAdminMarkets),
  ttlMinutes: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120)]),
  confirmation: z.literal("ALQUILAR GPU"),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireVastAdminApiSession();
  if (!auth.ok) return auth.response;
  try {
    requireSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errorCode: "INVALID_VAST_LEASE", message: "Confirma la oferta y los límites del alquiler." }, {
        status: 422,
        headers: privateNoStoreHeaders(),
      });
    }
    const lease = await createVastAdminLease(parsed.data, auth.session.user.id);
    return NextResponse.json({ lease }, {
      status: lease.state === "reconciling" ? 202 : 201,
      headers: privateNoStoreHeaders(),
    });
  } catch (error) {
    return vastAdminErrorResponse(error, "No se pudo crear el alquiler Vast.ai.");
  }
}
