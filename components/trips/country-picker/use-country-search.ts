"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { searchCountries, type Country } from "@/lib/countries";

/**
 * Search-box state for the country sheet: the query, the filtered list
 * (prefix matches first) and the keyboard-active row, plus the key handler.
 */
export function useCountrySearch(
  countries: Country[],
  onToggle: (country: Country) => void,
  onClose: () => void,
) {
  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => searchCountries(countries, query), [countries, query]);
  const active: Country | undefined = filtered[activeIndex];

  /** Clears the query and puts the keyboard cursor on `startIndex`. */
  function reset(startIndex: number) {
    setQueryState("");
    setActiveIndex(Math.max(0, startIndex));
  }

  function setQuery(value: string) {
    setQueryState(value);
    setActiveIndex(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const last = Math.max(0, filtered.length - 1);
    switch (e.key) {
      case "ArrowDown":
        setActiveIndex((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
      case "End":
        if (!e.ctrlKey) return;
        setActiveIndex(e.key === "Home" ? 0 : last);
        break;
      case "Enter":
        // Never let Enter here submit the surrounding form.
        if (active) onToggle(active);
        break;
      case "Escape":
        e.stopPropagation();
        onClose();
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  return {
    query,
    setQuery,
    filtered,
    active,
    activeIndex,
    setActiveIndex,
    reset,
    onKeyDown,
  };
}

export type CountrySearch = ReturnType<typeof useCountrySearch>;
