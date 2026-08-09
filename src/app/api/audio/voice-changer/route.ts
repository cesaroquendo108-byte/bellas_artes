import { NextResponse } from "next/server";
import { providerUnavailable } from "@/lib/audio/http";
import { getAudioProvider } from "@/lib/audio/provider";
import { validateMediaFile, voiceChangerRequestSchema } from "@/lib/audio/validation";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ errorCode: "INVALID_FORM", message: "No se pudo leer el audio." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ errorCode: "AUDIO_REQUIRED", message: "Selecciona un archivo de audio." }, { status: 422 });
  const fileError = validateMediaFile(file, "audio");
  if (fileError) return NextResponse.json({ errorCode: "INVALID_AUDIO", message: fileError }, { status: 422 });
  let payload: unknown = null;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return NextResponse.json({ errorCode: "INVALID_PAYLOAD", message: "Los controles de voz no son válidos." }, { status: 400 });
  }
  const parsed = voiceChangerRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ errorCode: "INVALID_VOICE_REQUEST", message: "Debes confirmar el consentimiento y revisar los controles." }, { status: 422 });

  const provider = getAudioProvider();
  if (provider.state !== "configured") return providerUnavailable("voice_changer");
  return providerUnavailable("voice_changer");
}
