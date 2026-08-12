import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredAssets } from "@/lib/assets/cleanup";
import { recordServiceHeartbeat } from "@/lib/admin/service-heartbeats";

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
    const result = await cleanupExpiredAssets();
    await recordServiceHeartbeat({
      serviceKey: "cron:assets-retention",
      status: result.failures.length ? "error" : "healthy",
      details: {
        scanned: result.scanned,
        deleted: result.deleted,
        failures: result.failures.length,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    await recordServiceHeartbeat({
      serviceKey: "cron:assets-retention",
      status: "error",
      details: { failures: 1 },
    }).catch(() => undefined);
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
