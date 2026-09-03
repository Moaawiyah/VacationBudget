"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useLocale, useDictionary } from "@/components/i18n/locale-provider";
import { Select } from "@/components/ui/select";

export function LanguageSwitcher() {
  const { locale } = useLocale();
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    startTransition(() => {
      setLocale(next);
    });
  }

  return (
    <div className="border-border bg-card rounded-3xl border p-5">
      <Select
        label={dict.settings.language}
        value={locale}
        onChange={handleChange}
        disabled={isPending}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </Select>
      <p className="text-muted-foreground mt-2 text-xs">
        {dict.settings.languageDescription}
      </p>
    </div>
  );
}
