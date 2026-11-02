import { NextResponse } from "next/server";
import { searchFreefieldApps, listFreefieldApps } from "@/lib/freefield/registry";
import type { FreefieldSection } from "@/lib/freefield/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;
  const section = (searchParams.get("section") as FreefieldSection) ?? undefined;
  const pack = searchParams.get("pack") ?? undefined;

  if (query || section || pack) {
    const apps = searchFreefieldApps({ query, section, pack });
    return NextResponse.json({ total: apps.length, apps });
  }

  const allApps = listFreefieldApps();
  return NextResponse.json({ total: allApps.length, apps: allApps });
}
