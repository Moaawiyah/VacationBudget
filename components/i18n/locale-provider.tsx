"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_BCP47, dirFor } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";

type LocaleContextValue = {
  locale: Locale;
  bcp47: string;
  dir: "ltr" | "rtl";
  dict: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Bridges the server-resolved locale + dictionary (read once, in the root
 * layout, from the locale cookie) down to Client Components — forms, the
 * bottom nav, buttons — without prop-drilling `dict` through every layer.
 * Server Components should keep calling getDictionary()/getLocale() from
 * lib/i18n/server.ts directly instead of reading this context.
 */
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, bcp47: LOCALE_BCP47[locale], dir: dirFor(locale), dict }),
    [locale, dict],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx)
    throw new Error("useLocale/useDictionary must be used within <LocaleProvider>");
  return ctx;
}

/** Current locale + writing direction + its Intl BCP-47 tag, for Client Components. */
export function useLocale() {
  const { locale, bcp47, dir } = useLocaleContext();
  return { locale, bcp47, dir };
}

/** The current locale's translated strings, for Client Components. */
export function useDictionary(): Dictionary {
  return useLocaleContext().dict;
}
