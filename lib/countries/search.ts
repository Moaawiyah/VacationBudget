import type { Country } from "./catalogue";

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

/**
 * Countries whose localized name, English name or code contains `query`,
 * with names that start with it listed first. An empty query returns all.
 */
export function searchCountries(countries: Country[], query: string): Country[] {
  const q = normalizeForSearch(query);
  if (!q) return countries;
  const prefix: Country[] = [];
  const rest: Country[] = [];
  for (const country of countries) {
    if (!country.searchKey.includes(q)) continue;
    const starts =
      normalizeForSearch(country.name).startsWith(q) ||
      normalizeForSearch(country.englishName).startsWith(q);
    (starts ? prefix : rest).push(country);
  }
  return [...prefix, ...rest];
}
