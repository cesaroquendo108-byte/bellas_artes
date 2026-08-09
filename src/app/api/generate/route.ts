import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if ("userId" in body) {
    return NextResponse.json(
      { error: "userId no forma parte de esta interfaz." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error: "La generación estará disponible en la Fase 2.",
      code: "GENERATION_NOT_AVAILABLE",
      creditsConsumed: 0,
    },
    { status: 503 },
  );
}
