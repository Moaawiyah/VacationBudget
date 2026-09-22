import { z } from "zod";

// Mirrors 0018_trip_cover.sql's checks exactly — the app rejects what the
// database would, with a clear error instead of a constraint violation.
export const COVER_URL_PATTERN =
  /^https:\/\/images\.pexels\.com\/photos\/\d+\/[A-Za-z0-9._-]+\?auto=compress&cs=tinysrgb&w=1600$/;
const PROVIDER_LINK_PATTERN = /^https:\/\/(www\.)?pexels\.com\//;

/**
 * A chosen cover as the trip form submits it. Arrives from the browser, so
 * it's untrusted: the image must be on the one allowed host in the one
 * allowed shape, and attribution links may only point at the provider.
 */
export const tripCoverSchema = z.object({
  url: z.string().max(500).regex(COVER_URL_PATTERN),
  alt: z.string().trim().max(300),
  provider: z.literal("pexels"),
  photographer: z.string().trim().min(1).max(120),
  photographerUrl: z.string().max(500).regex(PROVIDER_LINK_PATTERN),
  sourceUrl: z.string().max(500).regex(PROVIDER_LINK_PATTERN),
});
export type TripCover = z.infer<typeof tripCoverSchema>;

type CoverColumns = {
  cover_image_url: string | null;
  cover_image_alt: string | null;
  cover_provider: string | null;
  cover_photographer: string | null;
  cover_photographer_url: string | null;
  cover_source_url: string | null;
};

/** TripCover → trips columns (null clears every cover column together). */
export function toCoverColumns(cover: TripCover | null): CoverColumns {
  return {
    cover_image_url: cover?.url ?? null,
    cover_image_alt: cover ? cover.alt || null : null,
    cover_provider: cover?.provider ?? null,
    cover_photographer: cover?.photographer ?? null,
    cover_photographer_url: cover?.photographerUrl ?? null,
    cover_source_url: cover?.sourceUrl ?? null,
  };
}

/** trips row → TripCover, or null when the trip has no (complete) cover. */
export function coverFromTrip(trip: Partial<CoverColumns>): TripCover | null {
  const parsed = tripCoverSchema.safeParse({
    url: trip.cover_image_url,
    alt: trip.cover_image_alt ?? "",
    provider: trip.cover_provider,
    photographer: trip.cover_photographer,
    photographerUrl: trip.cover_photographer_url,
    sourceUrl: trip.cover_source_url,
  });
  return parsed.success ? parsed.data : null;
}
