import { Check } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";

type CountrySheetFooterProps = {
  selectedCount: number;
  onClear: () => void;
  onDone: () => void;
};

/** "Clear" and "Done (n)" buttons pinned to the bottom of the country sheet. */
export function CountrySheetFooter({
  selectedCount,
  onClear,
  onDone,
}: CountrySheetFooterProps) {
  const dict = useDictionary();

  return (
    <div className="border-border flex gap-3 border-t px-5 pt-3 pb-4">
      <button
        type="button"
        onClick={onClear}
        disabled={selectedCount === 0}
        className="bg-muted text-foreground flex h-12 items-center justify-center rounded-2xl px-5 text-base font-medium transition-opacity active:opacity-70 disabled:pointer-events-none disabled:opacity-50"
      >
        {dict.tripForm.destinationClear}
      </button>
      <button
        type="button"
        onClick={onDone}
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
  );
}
