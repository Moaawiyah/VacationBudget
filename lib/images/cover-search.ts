import { logger } from "@/lib/logger";
import { buildDestinationQuery, type CoverDestination } from "./destination-query";
import { PexelsProvider } from "./pexels-provider";
import {
  ImageProviderError,
  type DestinationImage,
  type DestinationImageProvider,
  type ImageSearchFailure,
} from "./types";

export const COVER_RESULT_COUNT = 6;

/**
 * Env-configured provider, or null without PEXELS_API_KEY — the caller
 * then just uses the default cover. The key is read here, server-side, and
 * never leaves this module (no NEXT_PUBLIC_ prefix, never logged).
 */
export function getDestinationImageProvider(): DestinationImageProvider | null {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;
  return new PexelsProvider(apiKey, Number(process.env.PEXELS_TIMEOUT_MS) || 8_000);
}

export type CoverSearchResult =
  | { status: "ok"; images: DestinationImage[] }
  | { status: "empty" }
  | { status: "unavailable"; reason: ImageSearchFailure };

// Pexels' free tier is 200 requests/hour for the whole app, so the same
// query ("Switzerland travel landscape") is answered from memory for a day
// rather than re-asked for every user who creates a Swiss trip. In-memory,
// like lib/rate-limit.ts, because the app runs as one Node process.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;
const cache = new Map<string, { images: DestinationImage[]; expiresAt: number }>();

/** Test hook — the cache is module state. */
export function clearCoverSearchCache(): void {
  cache.clear();
}

/**
 * Candidate covers for one destination. Never throws: a missing key,
 * timeout, rate limit, refused key, outage or malformed response all come
 * back as "unavailable" (and no results as "empty"), so the trip form just
 * keeps the default cover and carries on.
 */
export async function searchDestinationCovers(
  provider: DestinationImageProvider | null,
  destination: CoverDestination,
): Promise<CoverSearchResult> {
  const query = buildDestinationQuery(destination);
  if (!query) return { status: "empty" };
  if (!provider) return { status: "unavailable", reason: "not_configured" };

  const hit = cache.get(query);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.images.length ? { status: "ok", images: hit.images } : { status: "empty" };
  }

  let images: DestinationImage[];
  try {
    images = (await provider.searchDestination(query, COVER_RESULT_COUNT)).slice(
      0,
      COVER_RESULT_COUNT,
    );
  } catch (error) {
    const reason = error instanceof ImageProviderError ? error.kind : "unavailable";
    logger.warn("images.search failed", { reason });
    return { status: "unavailable", reason };
  }

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(query, { images, expiresAt: Date.now() + CACHE_TTL_MS });
  return images.length ? { status: "ok", images } : { status: "empty" };
}
