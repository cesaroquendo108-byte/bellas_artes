import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo JSON no es válido.", creditsConsumed: 0 },
      { status: 400 },
    );
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "userId" in body
  ) {
    return NextResponse.json(
      { error: "userId no forma parte de esta interfaz.", creditsConsumed: 0 },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      {
        error: "La autenticación no está configurada en este entorno.",
        code: "AUTH_NOT_CONFIGURED",
        creditsConsumed: 0,
      },
      { status: 503 },
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return NextResponse.json(
    {
      error: "La generación genérica no está habilitada. Usa el estudio específico.",
      code: "GENERATION_NOT_AVAILABLE",
      creditsConsumed: 0,
    },
    { status: 503 },
  );
}
