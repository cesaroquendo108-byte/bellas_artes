import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { privateNoStoreHeaders, requireSameOrigin, requireVastAdminApiSession, vastAdminErrorResponse } from "@/lib/admin/vast-api-auth";
import { vastAdminMarkets, vastAdminPresets } from "@/lib/admin/vast-contracts";
import { searchVastRentalOffers } from "@/lib/admin/vast-service";

export const runtime = "nodejs";

const schema = z.object({
  preset: z.enum(vastAdminPresets),
  market: z.enum(vastAdminMarkets),
  ttlMinutes: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120)]),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireVastAdminApiSession();
  if (!auth.ok) return auth.response;
  try {
    requireSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ errorCode: "INVALID_VAST_SEARCH", message: "Revisa el preset, mercado y duración." }, {
        status: 422,
        headers: privateNoStoreHeaders(),
      });
    }
    return NextResponse.json({ offers: await searchVastRentalOffers(parsed.data) }, { headers: privateNoStoreHeaders() });
  } catch (error) {
    return vastAdminErrorResponse(error, "No se pudieron consultar las ofertas Vast.ai.");
  }
}
