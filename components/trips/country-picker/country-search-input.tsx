"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import type { CountrySearch } from "./use-country-search";

type CountrySearchInputProps = {
  listId: string;
  activeOptionId: string | undefined;
  search: CountrySearch;
};

/**
 * The sheet's search box: a combobox driving the country listbox via
 * aria-activedescendant. Focuses itself when the sheet opens.
 */
export function CountrySearchInput({
  listId,
  activeOptionId,
  search,
}: CountrySearchInputProps) {
  const dict = useDictionary();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative mx-5 mb-3">
      <Search className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-label={dict.tripForm.destinationSearch}
        placeholder={dict.tripForm.destinationSearch}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onKeyDown={search.onKeyDown}
        className="border-border bg-background text-foreground focus:border-primary placeholder:text-muted-foreground h-12 w-full rounded-2xl border ps-11 pe-4 text-base outline-none"
      />
    </div>
  );
}
