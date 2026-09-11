"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import {
  destinationStorageValue,
  formatDestination,
  getDestinationParts,
  normalizeForSearch,
  parseDestination,
  type Country,
  type CountryCode,
  getCountries,
} from "@/lib/countries";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

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
 * bottom sheet with an autofocused search box and a listbox of checkbox rows
 * ("☑ 🇫🇷 France"); tapping a row toggles it and keeps the sheet open.
 * Emits the picked countries' English names (see lib/countries.ts). A value
 * that isn't a list of known countries (legacy free text) is shown as-is
 * until the first country is picked.
 */
export const CountryPicker = forwardRef<HTMLButtonElement, CountryPickerProps>(
  function CountryPicker({ label, value, onChange, onBlur, name, error }, ref) {
    const dict = useDictionary();
    const { bcp47, dir } = useLocale();
    const baseId = useId();
    const triggerId = `${baseId}-trigger`;
    const labelId = `${baseId}-label`;
    const listId = `${baseId}-list`;
    const optionId = (code: string) => `${baseId}-opt-${code}`;

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);

    const countries = useMemo(() => getCountries(bcp47), [bcp47]);
    const selectedCodes = useMemo(() => parseDestination(value), [value]);
    const parts = value ? getDestinationParts(value, bcp47) : [];
    const leadingFlag = parts[0]?.flag;

    const filtered = useMemo(() => {
      const q = normalizeForSearch(query);
      if (!q) return countries;
      const prefix: Country[] = [];
      const rest: Country[] = [];
      for (const c of countries) {
        if (!c.searchKey.includes(q)) continue;
        const starts =
          normalizeForSearch(c.name).startsWith(q) ||
          normalizeForSearch(c.englishName).startsWith(q);
        (starts ? prefix : rest).push(c);
      }
      return [...prefix, ...rest];
    }, [countries, query]);

    const activeCountry = filtered[activeIndex];
    const activeOptionId = activeCountry ? optionId(activeCountry.code) : undefined;

    function openPicker() {
      setQuery("");
      const first = selectedCodes[0];
      const idx = first ? countries.findIndex((c) => c.code === first) : 0;
      setActiveIndex(Math.max(0, idx));
      setOpen(true);
    }

    function closePicker() {
      setOpen(false);
      onBlur?.();
      triggerRef.current?.focus();
    }

    // Selection order is kept (it reads like an itinerary). A legacy
    // free-text value parses to [], so the first pick replaces it.
    function toggle(code: CountryCode) {
      const next = selectedCodes.includes(code)
        ? selectedCodes.filter((c) => c !== code)
        : [...selectedCodes, code];
      onChange(destinationStorageValue(next));
    }

    // Focus search + lock background scroll while the sheet is open.
    useEffect(() => {
      if (!open) return;
      searchRef.current?.focus();
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }, [open]);

    // Keep the keyboard-active row visible.
    useEffect(() => {
      if (!open || !activeOptionId) return;
      document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
    }, [open, activeOptionId]);

    function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Home" && e.ctrlKey) {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End" && e.ctrlKey) {
        e.preventDefault();
        setActiveIndex(Math.max(0, filtered.length - 1));
      } else if (e.key === "Enter") {
        // Never let Enter here submit the surrounding form.
        e.preventDefault();
        if (activeCountry) toggle(activeCountry.code);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closePicker();
      }
    }

    const selectedCount = selectedCodes.length;

    const sheet = open
      ? createPortal(
          <div
            dir={dir}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                closePicker();
              }
            }}
          >
            <div
              aria-hidden
              className="bg-foreground/40 absolute inset-0"
              onClick={closePicker}
            />
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
                      count: selectedCount,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePicker}
                  aria-label={dict.tripForm.destinationClose}
                  className="text-muted-foreground bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity active:opacity-60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 pb-3">
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    ref={searchRef}
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
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={onSearchKeyDown}
                    className="border-border bg-background text-foreground focus:border-primary placeholder:text-muted-foreground h-12 w-full rounded-2xl border ps-11 pe-4 text-base outline-none"
                  />
                </div>
              </div>

              <ul
                id={listId}
                role="listbox"
                aria-multiselectable="true"
                aria-labelledby={labelId}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3"
              >
                {filtered.map((country, i) => {
                  const selected = selectedCodes.includes(country.code);
                  const active = i === activeIndex;
                  return (
                    <li
                      key={country.code}
                      id={optionId(country.code)}
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggle(country.code)}
                      onMouseMove={() => {
                        if (!active) setActiveIndex(i);
                      }}
                      className={cn(
                        "flex h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-base select-none",
                        active && "bg-muted",
                        selected && "font-medium",
                      )}
                    >
                      {/* Visual checkbox; the option's aria-selected carries the state. */}
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/60 bg-card",
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span aria-hidden className="text-xl leading-none">
                        {country.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li
                    role="presentation"
                    className="text-muted-foreground px-3 py-8 text-center text-sm"
                  >
                    {dict.tripForm.destinationNoResults}
                  </li>
                )}
              </ul>

              <div className="border-border flex gap-3 border-t px-5 pt-3 pb-4">
                <button
                  type="button"
                  onClick={() => onChange("")}
                  disabled={selectedCount === 0}
                  className="bg-muted text-foreground flex h-12 items-center justify-center rounded-2xl px-5 text-base font-medium transition-opacity active:opacity-70 disabled:pointer-events-none disabled:opacity-50"
                >
                  {dict.tripForm.destinationClear}
                </button>
                <button
                  type="button"
                  onClick={closePicker}
                  className="bg-primary text-primary-foreground flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-medium transition-opacity active:opacity-80"
                >
                  <Check aria-hidden className="h-4 w-4" />
                  {dict.tripForm.destinationDone}
                  {selectedCount > 0 && (
                    <span className="bg-primary-foreground/20 rounded-full px-2 text-sm tabular-nums">
                      {selectedCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          id={labelId}
          htmlFor={triggerId}
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
          id={triggerId}
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
          {!leadingFlag && <Globe className="text-muted-foreground h-4 w-4 shrink-0" />}
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
          {selectedCount > 1 && (
            <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
              {selectedCount}
            </span>
          )}
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
        </button>
        {error && (
          <p id={`${baseId}-error`} className="text-danger text-sm">
            {error}
          </p>
        )}
        {sheet}
      </div>
    );
  },
);
