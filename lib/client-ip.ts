import { headers } from "next/headers";

/**
 * Best-effort client IP for rate-limit keys. Behind Railway's proxy the
 * original visitor is the first entry of x-forwarded-for. Falls back to
 * x-real-ip, then "unknown" — an imprecise key only rate-limits a little
 * too broadly, never too narrowly, so that's the safe direction to fail in.
 */
export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}
