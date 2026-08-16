const CANONICAL_SITE_URL = "https://bellasartes-xi.vercel.app";

function isLocalDevelopmentUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

export function getOAuthRedirectBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    const normalizedUrl = configuredUrl.replace(/\/+$/, "");

    // Localhost is valid only for local development. A stale Vercel variable
    // must never send a production OAuth flow away from the public app.
    try {
      const parsed = new URL(normalizedUrl);
      const isProductionHttps = process.env.NODE_ENV !== "production" || parsed.protocol === "https:";
      if (isProductionHttps && (process.env.NODE_ENV !== "production" || !isLocalDevelopmentUrl(normalizedUrl))) {
        return normalizedUrl;
      }
    } catch {
      // Ignore malformed or redacted values and use the canonical fallback.
    }
  }

  // Never use VERCEL_URL as the OAuth callback origin: it points to a
  // deployment-specific hostname that is not guaranteed to be allow-listed
  // in Supabase/Google. Local development keeps its localhost callback.
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return CANONICAL_SITE_URL;
}
