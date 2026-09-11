import { LOCALES, LOCALE_BCP47 } from "@/lib/i18n/config";
import { COUNTRY_CODES, COUNTRY_CODE_SET, type CountryCode } from "./codes";
import { normalizeForSearch } from "./search";

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

/** Regional-indicator emoji flag for a 2-letter code ("FR" → "🇫🇷"). */
export function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

const displayNamesCache = new Map<string, Intl.DisplayNames>();

/** A country's name in `bcp47`, from the runtime's own locale data. */
export function regionName(code: string, bcp47: string): string {
  let names = displayNamesCache.get(bcp47);
  if (!names) {
    names = new Intl.DisplayNames([bcp47], { type: "region", fallback: "code" });
    displayNamesCache.set(bcp47, names);
  }
  return names.of(code) ?? code;
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
 * Resolves one country name or code to its ISO code: matches the English (or
 * any app-locale) name case/diacritic-insensitively, or a raw 2-letter code.
 * Returns null for anything else, e.g. legacy free text like "Paris".
 */
export function findCountry(value: string | null | undefined): CountryCode | null {
  const raw = value?.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.length === 2 && COUNTRY_CODE_SET.has(upper)) return upper as CountryCode;
  return getLookup().get(normalizeForSearch(raw)) ?? null;
}
