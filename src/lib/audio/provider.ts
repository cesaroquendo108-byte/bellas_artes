import "server-only";

import { getAudioProviderEnv } from "@/lib/env";
import type { AudioJobKind, AudioProviderState } from "./types";

export interface AudioProviderJobInput {
  kind: AudioJobKind;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

export interface AudioProviderJobResult {
  providerJobId: string;
  status: "queued" | "processing";
}

export interface AudioProvider {
  readonly name: string;
  readonly state: AudioProviderState;
  submit(input: AudioProviderJobInput): Promise<AudioProviderJobResult>;
  cancel(providerJobId: string): Promise<void>;
}

export class AudioProviderUnavailableError extends Error {
  readonly code = "AUDIO_PROVIDER_NOT_CONFIGURED";

  constructor() {
    super("La generación de audio todavía no está conectada a un proveedor.");
    this.name = "AudioProviderUnavailableError";
  }
}

class UnavailableAudioProvider implements AudioProvider {
  readonly name = "unconfigured";
  readonly state = "provider_unconfigured" as const;

  async submit(): Promise<never> {
    throw new AudioProviderUnavailableError();
  }

  async cancel(): Promise<void> {
    throw new AudioProviderUnavailableError();
  }
}

export function getAudioProvider(): AudioProvider {
  const config = getAudioProviderEnv();
  // Un nombre de proveedor y una clave no bastan para activarlo: además debe
  // existir un adaptador auditado en este registro. Así una variable mal
  // escrita nunca habilita generación ni consumo de créditos por accidente.
  if (config.provider !== "disabled" && config.apiKeyConfigured) {
    return new UnavailableAudioProvider();
  }
  return new UnavailableAudioProvider();
}

export function getAudioProviderStatus() {
  const config = getAudioProviderEnv();
  return {
    state: "provider_unconfigured" as const,
    provider: config.provider,
    credentialsPresent: config.apiKeyConfigured,
    message: config.provider === "disabled"
      ? "La generación de audio está deshabilitada hasta conectar un proveedor aprobado."
      : "Hay configuración parcial, pero todavía no existe un adaptador de audio aprobado.",
  };
}
