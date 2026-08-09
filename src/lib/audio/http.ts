import { NextResponse } from "next/server";
import { getAudioProviderStatus } from "./provider";
import type { AudioJobKind, AudioJobResponse } from "./types";

export function providerUnavailable(kind: AudioJobKind) {
  const status = getAudioProviderStatus();
  const body: AudioJobResponse = {
    jobId: null,
    kind,
    status: "not_configured",
    creditsReserved: 0,
    errorCode: "AUDIO_PROVIDER_NOT_CONFIGURED",
    message: status.message,
  };
  return NextResponse.json(body, { status: 503 });
}
