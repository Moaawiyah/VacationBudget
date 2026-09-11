"use client";

import { forwardRef, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import {
  destinationStorageValue,
  formatDestination,
  getCountries,
  getDestinationParts,
  parseDestination,
  type CountryCode,
} from "@/lib/countries";
import { cn } from "@/lib/utils";
import { CountrySheet } from "./country-sheet";
import { useCountrySearch } from "./use-country-search";

type CountryPickerProps = {
  label: string;
  /** Stored destination: comma-separated English country names, or legacy free text. */
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  error?: string;
};

/**
 * Searchable multi-country picker styled like <Input>. The trigger opens a
 * bottom sheet of checkbox rows ("☑ 🇫🇷 France"); tapping a row toggles it
 * and keeps the sheet open. Emits the picked countries' English names (see
 * lib/countries). A legacy free-text value is shown as-is until replaced.
 */
export const CountryPicker = forwardRef<HTMLButtonElement, CountryPickerProps>(
  function CountryPicker({ label, value, onChange, onBlur, name, error }, ref) {
    const dict = useDictionary();
    const { bcp47 } = useLocale();
    const baseId = useId();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    const countries = useMemo(() => getCountries(bcp47), [bcp47]);
    const selectedCodes = useMemo(() => parseDestination(value), [value]);
    const parts = value ? getDestinationParts(value, bcp47) : [];

    // Selection order is kept (it reads like an itinerary). A legacy
    // free-text value parses to [], so the first pick replaces it.
    function toggle(code: CountryCode) {
      const next = selectedCodes.includes(code)
        ? selectedCodes.filter((c) => c !== code)
        : [...selectedCodes, code];
      onChange(destinationStorageValue(next));
    }

    function closePicker() {
      setOpen(false);
      onBlur?.();
      triggerRef.current?.focus();
    }

    const search = useCountrySearch(
      countries,
      (country) => toggle(country.code),
      closePicker,
    );

    function openPicker() {
      const first = selectedCodes[0];
      search.reset(first ? countries.findIndex((c) => c.code === first) : 0);
      setOpen(true);
    }

    return (
      <div className="flex flex-col gap-1.5">
        <label
          id={`${baseId}-label`}
          htmlFor={`${baseId}-trigger`}
          className="text-muted-foreground text-sm font-medium"
        >
          {label}
        </label>
        <button
          ref={(el) => {
            triggerRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          id={`${baseId}-trigger`}
          name={name}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby={error ? `${baseId}-error` : undefined}
          onClick={openPicker}
          className={cn(
            "border-border bg-card text-card-foreground focus:border-primary flex h-12 w-full items-center gap-2.5 rounded-2xl border px-4 text-start text-base outline-none",
            error && "border-danger",
          )}
        >
          {!parts[0]?.flag && (
            <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
          <span
            suppressHydrationWarning
            className={cn(
              "min-w-0 flex-1 truncate",
              parts.length === 0 && "text-muted-foreground",
            )}
          >
            {parts.length > 0
              ? formatDestination(value ?? "", bcp47)
              : dict.tripForm.destinationPlaceholder}
          </span>
          {selectedCodes.length > 1 && (
            <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
              {selectedCodes.length}
            </span>
          )}
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
        </button>
        {error && (
          <p id={`${baseId}-error`} className="text-danger text-sm">
            {error}
          </p>
        )}
        {open && (
          <CountrySheet
            baseId={baseId}
            label={label}
            selectedCodes={selectedCodes}
            search={search}
            onToggle={toggle}
            onClear={() => onChange("")}
            onClose={closePicker}
          />
        )}
      </div>
    );
  },
);
