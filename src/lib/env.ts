import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseAdminEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
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
