import { Check } from "lucide-react";
import type { Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

type CountryOptionProps = {
  id: string;
  country: Country;
  selected: boolean;
  /** Highlighted by the keyboard cursor (or the mouse). */
  active: boolean;
  onToggle: () => void;
  onHover: () => void;
};

/** One listbox row: a visual checkbox, the flag and the localized name. */
export function CountryOption({
  id,
  country,
  selected,
  active,
  onToggle,
  onHover,
}: CountryOptionProps) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onToggle}
      onMouseMove={() => {
        if (!active) onHover();
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
}
