/**
 * Sanitizes a user-supplied redirect target (e.g. the ?next= query param on
 * the email-confirmation link) so it can never point off-site. Only same-origin
 * app paths are allowed: an absolute URL, a protocol-relative "//host" (or
 * "/\host", which browsers treat the same way), or anything else that doesn't
 * start with a single "/" falls back to the default target.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/trips",
): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  // "//host" and "/\host" are treated as protocol-relative by browsers, and
  // control characters can smuggle extra headers into a Location value.
  if (
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("\r") ||
    candidate.includes("\n") ||
    candidate.includes("\t")
  ) {
    return fallback;
  }
  return candidate;
}
