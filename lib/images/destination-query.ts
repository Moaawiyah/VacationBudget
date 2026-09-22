import { findCountry, parseDestination, regionName } from "@/lib/countries";

/** One place a cover can be searched for. `city` is optional; `country` is the broadest place known. */
export type CoverDestination = { city?: string; country: string };

const MAX_PLACE_LENGTH = 60;
const MAX_DESTINATIONS = 10;

/**
 * Letters (any script), marks, spaces, apostrophes, hyphens and dots only,
 * whitespace collapsed, length-bounded. Strips anything that could act as
 * search syntax or smuggle extra text into the provider query.
 */
export function normalizePlace(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PLACE_LENGTH)
    .trim();
}

/**
 * The deterministic search query for one destination — no AI involved.
 * City + country is more specific, so it's preferred; country alone gets
 * "landscape" to steer toward scenery rather than maps or flags.
 * Returns null when nothing usable is left after normalization.
 */
export function buildDestinationQuery(destination: CoverDestination): string | null {
  const country = normalizePlace(destination.country);
  const city = normalizePlace(destination.city);
  if (city && country) return `${city} ${country} travel`;
  const place = country || city;
  return place ? `${place} travel landscape` : null;
}

/**
 * Every destination a trip's cover could come from, in stored order — the
 * first is the default (the app has no "primary destination" concept).
 * Stored destinations are English country names ("Italy, Switzerland");
 * older free-text ones like "Paris, France" become city + country when the
 * last part is a country, or a single place otherwise.
 */
export function coverDestinations(stored: string | null | undefined): CoverDestination[] {
  const codes = parseDestination(stored);
  if (codes.length > 0) {
    return codes
      .slice(0, MAX_DESTINATIONS)
      .map((code) => ({ country: regionName(code, "en") }));
  }
  const parts = (stored ?? "")
    .split(",")
    .map((p) => normalizePlace(p))
    .filter(Boolean);
  if (parts.length === 0) return [];
  const last = parts[parts.length - 1];
  const lastCode = findCountry(last);
  if (parts.length >= 2 && lastCode) {
    return [{ city: parts.slice(0, -1).join(" "), country: regionName(lastCode, "en") }];
  }
  return [{ country: parts.join(" ") }];
}
