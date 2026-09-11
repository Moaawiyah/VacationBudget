// Country catalogue for the trip "destination" picker.
//
// Storage convention: a trip's `destination` column stores the country's
// ENGLISH display name (e.g. "France"), which stays human-readable in the DB
// and backward-compatible with older free-text destinations. Everything
// shown to the user is re-localized at render time from the ISO code.
//
// Pure module (no "use client") — usable from Server and Client Components.

import { LOCALES, LOCALE_BCP47 } from "@/lib/i18n/config";

// ISO 3166-1 alpha-2 codes (all officially assigned) + XK (Kosovo, a widely
// used user-assigned code that Intl and flag emoji both support).
// prettier-ignore
export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW",
  "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT",
  "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS",
  "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "XK",
  "YE", "YT",
  "ZA", "ZM", "ZW",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export type Country = {
  code: CountryCode;
  flag: string;
  /** Name in the requested locale. */
  name: string;
  /** Canonical English name — the value stored in `trips.destination`. */
  englishName: string;
  /** Pre-normalized haystack (localized + English name + code) for search. */
  searchKey: string;
};

const CODE_SET = new Set<string>(COUNTRY_CODES);

/** Regional-indicator emoji flag for a 2-letter code ("FR" → "🇫🇷"). */
export function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

// Built via the constructor so TS (target ES2017) doesn't reject the
// ES2018 Unicode property escape at compile time.
const MARKS = new RegExp("\\p{M}", "gu");
const APOSTROPHES = /['’`ʼ]/g;

/** Case-, diacritic- and apostrophe-insensitive form for matching/search. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(MARKS, "")
    .replace(APOSTROPHES, "")
    .toLowerCase()
    .trim();
}

const displayNamesCache = new Map<string, Intl.DisplayNames>();

function regionName(code: string, bcp47: string): string {
  let dn = displayNamesCache.get(bcp47);
  if (!dn) {
    dn = new Intl.DisplayNames([bcp47], { type: "region", fallback: "code" });
    displayNamesCache.set(bcp47, dn);
  }
  return dn.of(code) ?? code;
}

const listCache = new Map<string, Country[]>();

/** All countries, localized and alphabetically sorted for `bcp47`. */
export function getCountries(bcp47: string): Country[] {
  const cached = listCache.get(bcp47);
  if (cached) return cached;

  const collator = new Intl.Collator(bcp47, { sensitivity: "base" });
  const list = COUNTRY_CODES.map((code): Country => {
    const name = regionName(code, bcp47);
    const englishName = regionName(code, "en");
    return {
      code,
      flag: flagEmoji(code),
      name,
      englishName,
      searchKey: normalizeForSearch(`${name} ${englishName} ${code}`),
    };
  }).sort((a, b) => collator.compare(a.name, b.name));

  listCache.set(bcp47, list);
  return list;
}

let lookup: Map<string, CountryCode> | null = null;

// Maps normalized names (English + every app locale) → code, so stored
// values resolve regardless of which language they were written in.
function getLookup(): Map<string, CountryCode> {
  if (lookup) return lookup;
  const map = new Map<string, CountryCode>();
  for (const bcp47 of ["en", ...LOCALES.map((l) => LOCALE_BCP47[l])]) {
    for (const code of COUNTRY_CODES) {
      const key = normalizeForSearch(regionName(code, bcp47));
      if (!map.has(key)) map.set(key, code);
    }
  }
  lookup = map;
  return map;
}

/**
 * Resolves a stored destination to an ISO code: matches the English (or any
 * app-locale) country name case/diacritic-insensitively, or a raw 2-letter
 * code. Returns null for legacy free text like "Paris, France".
 */
export function findCountry(destination: string | null | undefined): CountryCode | null {
  const raw = destination?.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.length === 2 && CODE_SET.has(upper)) return upper as CountryCode;
  return getLookup().get(normalizeForSearch(raw)) ?? null;
}

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
