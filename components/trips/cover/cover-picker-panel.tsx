"use client";

import { useDictionary } from "@/components/i18n/locale-provider";
import type { CoverDestination } from "@/lib/images/destination-query";
import type { CoverSearchResult } from "@/lib/images/cover-search";
import type { DestinationImage } from "@/lib/images/types";
import { cn } from "@/lib/utils";
import { CoverGrid, CoverGridSkeleton } from "./cover-grid";

/**
 * The expanded "Change cover" panel: which destination to search (only
 * when the trip has several), the candidate photos, and the way back to
 * the default cover. The Pexels credit link is shown whenever its search
 * results are, per its API guidelines.
 */
export function CoverPickerPanel({
  destinations,
  active,
  onActiveChange,
  loading,
  result,
  selectedUrl,
  onSelect,
  onUseDefault,
}: {
  destinations: CoverDestination[];
  active: number;
  onActiveChange: (index: number) => void;
  loading: boolean;
  result: CoverSearchResult | null;
  selectedUrl: string | null;
  onSelect: (image: DestinationImage) => void;
  onUseDefault: () => void;
}) {
  const dict = useDictionary().tripForm;
  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-3">
      {destinations.length > 1 && (
        <div
          role="group"
          aria-label={dict.coverDestination}
          className="flex flex-wrap gap-2"
        >
          {destinations.map((d, i) => (
            <button
              key={`${d.city ?? ""}|${d.country}`}
              type="button"
              aria-pressed={i === active}
              onClick={() => onActiveChange(i)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                i === active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {d.city ? `${d.city}, ${d.country}` : d.country}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {loading ? (
          <>
            <span className="sr-only">{dict.coverLoading}</span>
            <CoverGridSkeleton />
          </>
        ) : result?.status === "ok" ? (
          <CoverGrid
            images={result.images}
            selectedUrl={selectedUrl}
            onSelect={onSelect}
            labelTemplate={dict.selectPhoto}
          />
        ) : result ? (
          <p className="text-muted-foreground text-sm">
            {result.status === "empty" ? dict.coverEmpty : dict.coverUnavailable}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onUseDefault}
          aria-pressed={selectedUrl === null}
          className="text-primary text-xs font-semibold"
        >
          {dict.useDefaultCover}
        </button>
        {result?.status === "ok" && (
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground text-[11px] underline-offset-2 hover:underline"
          >
            {dict.photosByPexels}
          </a>
        )}
      </div>
    </div>
  );
}
