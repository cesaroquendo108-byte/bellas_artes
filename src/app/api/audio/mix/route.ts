import { NextResponse } from "next/server";
import { providerUnavailable } from "@/lib/audio/http";
import { getAudioProvider } from "@/lib/audio/provider";
import { mixRequestSchema } from "@/lib/audio/validation";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errorCode: "INVALID_JSON", message: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }
  const parsed = mixRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_MIX_REQUEST", message: "Revisa el proyecto y el formato de salida." }, { status: 422 });
  const provider = getAudioProvider();
  if (provider.state !== "configured") return providerUnavailable("video_mix");
  return providerUnavailable("video_mix");
}
