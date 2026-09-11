import { findCountry, flagEmoji, regionName } from "./catalogue";
import type { CountryCode } from "./codes";

// A trip can span several countries, stored as "France, Italy". No country
// name in any app locale contains a comma, so splitting on it is unambiguous.
const DESTINATION_SEPARATOR = ", ";

/**
 * Resolves a stored destination to its ISO codes, in stored order:
 * "France, Italy" → ["FR", "IT"]. Returns [] when empty, and for legacy free
 * text like "Paris, France" — a value only counts if every part is a country.
 */
export function parseDestination(destination: string | null | undefined): CountryCode[] {
  const raw = destination?.trim();
  if (!raw) return [];
  const codes: CountryCode[] = [];
  for (const part of raw.split(",")) {
    const code = findCountry(part);
    if (!code) return [];
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

/** The value to store in `trips.destination` for the picked countries. */
export function destinationStorageValue(codes: readonly CountryCode[]): string {
  return codes.map((code) => regionName(code, "en")).join(DESTINATION_SEPARATOR);
}

export type DestinationPart = {
  code: CountryCode | null;
  flag: string | null;
  name: string;
};

/**
 * Display parts for a stored destination in the given locale: one flag +
 * localized name per country, or a single flagless part holding the raw
 * legacy text.
 */
export function getDestinationParts(
  destination: string,
  bcp47: string,
): DestinationPart[] {
  const codes = parseDestination(destination);
  if (codes.length === 0) {
    const raw = destination.trim();
    return raw ? [{ code: null, flag: null, name: raw }] : [];
  }
  return codes.map((code) => ({
    code,
    flag: flagEmoji(code),
    name: regionName(code, bcp47),
  }));
}

/** One-line "🇫🇷 France, 🇮🇹 Italy" label (or the raw legacy text). */
export function formatDestination(destination: string, bcp47: string): string {
  const labels = getDestinationParts(destination, bcp47).map(({ flag, name }) =>
    flag ? `${flag} ${name}` : name,
  );
  // Locale-aware separators (e.g. Arabic "،").
  return new Intl.ListFormat(bcp47, { type: "unit", style: "short" }).format(labels);
}
