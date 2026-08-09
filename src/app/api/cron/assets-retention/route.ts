import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredAssets } from "@/lib/assets/cleanup";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "La limpieza programada no está configurada." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json(await cleanupExpiredAssets());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "No se pudo completar la limpieza.",
      },
      { status: 500 },
    );
  }
}
