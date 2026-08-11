const CANONICAL_SITE_URL = "https://bellasartes-xi.vercel.app";

export function getOAuthRedirectBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  // Never use VERCEL_URL as the OAuth callback origin: it points to a
  // deployment-specific hostname that is not guaranteed to be allow-listed
  // in Supabase/Google. Local development keeps its localhost callback.
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return CANONICAL_SITE_URL;
}
