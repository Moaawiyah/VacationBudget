"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import type { CountryCode } from "@/lib/countries";
import { interpolate } from "@/lib/i18n/interpolate";
import { CountryOption } from "./country-option";
import { CountrySearchInput } from "./country-search-input";
import { CountrySheetFooter } from "./country-sheet-footer";
import type { CountrySearch } from "./use-country-search";

type CountrySheetProps = {
  baseId: string;
  label: string;
  selectedCodes: CountryCode[];
  search: CountrySearch;
  onToggle: (code: CountryCode) => void;
  onClear: () => void;
  onClose: () => void;
};

/**
 * Bottom sheet with an autofocused search box and a multi-select listbox of
 * countries. Mounted only while the picker is open.
 */
export function CountrySheet({
  baseId,
  label,
  selectedCodes,
  search,
  onToggle,
  onClear,
  onClose,
}: CountrySheetProps) {
  const dict = useDictionary();
  const { dir } = useLocale();
  const listId = `${baseId}-list`;
  const optionId = (code: string) => `${baseId}-opt-${code}`;
  const activeOptionId = search.active ? optionId(search.active.code) : undefined;

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keep the keyboard-active row visible.
  useEffect(() => {
    if (activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeOptionId]);

  return createPortal(
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div aria-hidden className="bg-foreground/40 absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="bg-card text-card-foreground safe-bottom border-border relative flex h-[min(85dvh,40rem)] w-full max-w-md flex-col rounded-t-3xl border-t shadow-lg"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 id={`${baseId}-title`} className="text-base font-semibold">
              {label}
            </h2>
            <p aria-live="polite" className="text-muted-foreground text-xs">
              {interpolate(dict.tripForm.destinationSelectedCount, {
                count: selectedCodes.length,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.tripForm.destinationClose}
            className="text-muted-foreground bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity active:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <CountrySearchInput
          listId={listId}
          activeOptionId={activeOptionId}
          search={search}
        />

        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={`${baseId}-label`}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3"
        >
          {search.filtered.map((country, i) => (
            <CountryOption
              key={country.code}
              id={optionId(country.code)}
              country={country}
              selected={selectedCodes.includes(country.code)}
              active={i === search.activeIndex}
              onToggle={() => onToggle(country.code)}
              onHover={() => search.setActiveIndex(i)}
            />
          ))}
          {search.filtered.length === 0 && (
            <li
              role="presentation"
              className="text-muted-foreground px-3 py-8 text-center text-sm"
            >
              {dict.tripForm.destinationNoResults}
            </li>
          )}
        </ul>

        <CountrySheetFooter
          selectedCount={selectedCodes.length}
          onClear={onClear}
          onDone={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}
