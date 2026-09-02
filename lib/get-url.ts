/**
 * Resolves the app's public base URL for building absolute links (e.g. the
 * email-confirmation redirect Supabase needs). Set NEXT_PUBLIC_SITE_URL in
 * production (Railway); falls back to localhost for local dev.
 */
export function getURL() {
  let url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  url = url.startsWith("http") ? url : `https://${url}`;
  url = url.endsWith("/") ? url : `${url}/`;
  return url;
}
