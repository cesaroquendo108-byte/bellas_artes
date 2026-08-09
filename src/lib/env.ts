import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

function validUrl(name: string): string {
  const value = required(name);

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
  } catch {
    throw new Error(`${name} debe ser una URL HTTPS válida.`);
  }

  return value;
}

function validSupabasePublicKey(): string {
  const value = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (value.trim().length < 40) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY no parece una clave pública válida.");
  }
  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: validUrl("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: validSupabasePublicKey(),
  };
}

export function getSupabaseAdminEnv() {
  return {
    url: validUrl("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getR2Env() {
  return {
    accountId: required("CLOUDFLARE_R2_ACCOUNT_ID"),
    accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    bucket: required("CLOUDFLARE_R2_BUCKET"),
  };
}

export function getAudioProviderEnv() {
  return {
    provider: process.env.AUDIO_PROVIDER?.trim() || "disabled",
    apiKeyConfigured: Boolean(process.env.AUDIO_PROVIDER_API_KEY?.trim()),
    webhookSecretConfigured: Boolean(process.env.AUDIO_PROVIDER_WEBHOOK_SECRET?.trim()),
  };
}
