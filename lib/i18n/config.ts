export const LOCALES = ["en", "he", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const RTL_LOCALES: readonly Locale[] = ["he", "ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  he: "עברית",
  ar: "العربية",
};

// BCP-47 tags for Intl formatters. Arabic pins `-u-nu-latn` so numbers stay
// Latin-digit — the app's numeric <input>s can only ever produce Latin
// digits, so mixing in Eastern Arabic numerals for *display* would make the
// UI's own numbers look inconsistent with what you type into it.
export const LOCALE_BCP47: Record<Locale, string> = {
  en: "en",
  he: "he",
  ar: "ar-u-nu-latn",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}
