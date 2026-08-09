import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let validUrl = false;

  try {
    validUrl = new URL(url ?? "").protocol === "https:";
  } catch {
    validUrl = false;
  }

  if (!validUrl || !anonKey || anonKey.trim().length < 40) {
    throw new Error("Supabase no está configurado en el navegador.");
  }
  return createBrowserClient(
    url!,
    anonKey!,
  );
}
