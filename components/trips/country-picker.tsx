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
  countryStorageValue,
  findCountry,
  getCountries,
  getDestinationDisplay,
  normalizeForSearch,
  type Country,
} from "@/lib/countries";
import { cn } from "@/lib/utils";

type CountryPickerProps = {
  label: string;
  /** Stored destination: an English country name, or legacy free text. */
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  error?: string;
};

/**
 * Searchable country picker styled like <Input>. The trigger opens a bottom
 * sheet with an autofocused search box and a listbox of "🇫🇷 France" rows.
 * Emits the country's English name (see lib/countries.ts). A value that
 * isn't a known country (legacy free text) is shown as-is until replaced.
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
    const selectedCode = findCountry(value);
    const display = value ? getDestinationDisplay(value, bcp47) : null;

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
      const idx = selectedCode ? countries.findIndex((c) => c.code === selectedCode) : 0;
      setActiveIndex(Math.max(0, idx));
      setOpen(true);
    }

    function closePicker() {
      setOpen(false);
      onBlur?.();
      triggerRef.current?.focus();
    }

    function select(country: Country) {
      onChange(countryStorageValue(country.code));
      closePicker();
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
        if (activeCountry) select(activeCountry);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closePicker();
      }
    }

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
                <h2 id={`${baseId}-title`} className="text-base font-semibold">
                  {label}
                </h2>
                <button
                  type="button"
                  onClick={closePicker}
                  aria-label={dict.tripForm.destinationClose}
                  className="text-muted-foreground bg-muted flex h-8 w-8 items-center justify-center rounded-full transition-opacity active:opacity-60"
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
                aria-labelledby={labelId}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3"
              >
                {filtered.map((country, i) => {
                  const selected = country.code === selectedCode;
                  const active = i === activeIndex;
                  return (
                    <li
                      key={country.code}
                      id={optionId(country.code)}
                      role="option"
                      aria-selected={selected}
                      onClick={() => select(country)}
                      onMouseMove={() => {
                        if (!active) setActiveIndex(i);
                      }}
                      className={cn(
                        "flex h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-base",
                        active && "bg-muted",
                        selected && "text-primary font-medium",
                      )}
                    >
                      <span aria-hidden className="text-xl leading-none">
                        {country.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{country.name}</span>
                      {selected && <Check className="text-primary h-4 w-4 shrink-0" />}
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
          {display?.flag ? (
            <span aria-hidden className="text-xl leading-none">
              {display.flag}
            </span>
          ) : (
            <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
          <span
            suppressHydrationWarning
            className={cn("min-w-0 flex-1 truncate", !display && "text-muted-foreground")}
          >
            {display ? display.name : dict.tripForm.destinationPlaceholder}
          </span>
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
