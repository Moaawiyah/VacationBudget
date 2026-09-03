import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import type { Dictionary } from "./types";
import en from "./dictionaries/en";
import he from "./dictionaries/he";
import ar from "./dictionaries/ar";

export const LOCALE_COOKIE = "locale";

const dictionaries: Record<Locale, Dictionary> = { en, he, ar };

/**
 * Cookie first (set by the language switcher via the setLocale action), then
 * the browser's Accept-Language header on a user's first visit, then English.
 * cache()-wrapped so every server component/action in one request shares a
 * single read, same pattern as lib/data/trips.ts's getTrip.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = (await headers()).get("accept-language");
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const base = part.split(";")[0]!.trim().split("-")[0]!.toLowerCase();
      if (isLocale(base)) return base;
    }
  }

  return DEFAULT_LOCALE;
});

export const getDictionary = cache(async (): Promise<Dictionary> => {
  return dictionaries[await getLocale()];
});
