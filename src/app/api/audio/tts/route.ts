import { NextResponse } from "next/server";
import { providerUnavailable } from "@/lib/audio/http";
import { getAudioProvider } from "@/lib/audio/provider";
import { ttsRequestSchema } from "@/lib/audio/validation";
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
  const parsed = ttsRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_TTS_REQUEST", message: "Revisa el guion y los controles.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });

  const provider = getAudioProvider();
  if (provider.state !== "configured") return providerUnavailable("tts");
  // No adapter is registered yet. This guard prevents a partial environment
  // configuration from creating jobs or touching the credit ledger.
  return providerUnavailable("tts");
}
