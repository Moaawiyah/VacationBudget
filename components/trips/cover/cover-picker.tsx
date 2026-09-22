"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { buildDestinationQuery, coverDestinations } from "@/lib/images/destination-query";
import type { TripCover } from "@/lib/images/cover-schema";
import type { DestinationImage } from "@/lib/images/types";
import { TripCoverImage } from "./trip-cover-image";
import { CoverAttribution } from "./cover-attribution";
import { CoverPickerPanel } from "./cover-picker-panel";
import { useCoverSearch } from "./use-cover-search";

const AUTO_SEARCH_DELAY_MS = 700;

function toCover(image: DestinationImage): TripCover {
  const { url, alt, provider, photographer, photographerUrl, sourceUrl } = image;
  return { url, alt, provider, photographer, photographerUrl, sourceUrl };
}

/**
 * The trip form's cover field. When the trip's first destination changes
 * (not on every keystroke or country toggle, and never just because the
 * edit page opened), it looks up photos once and pre-selects the first —
 * unless the user picks one themselves while that lookup is in flight. "Change cover" opens
 * the full picker; "Use default cover" is always available.
 */
export function CoverPicker({
  destination,
  value,
  onChange,
}: {
  destination: string;
  value: TripCover | null | undefined;
  onChange: (cover: TripCover | null) => void;
}) {
  const dict = useDictionary().tripForm;
  const destinations = useMemo(() => coverDestinations(destination), [destination]);
  const firstQuery = destinations[0] ? buildDestinationQuery(destinations[0]) : null;
  const handledQuery = useRef(firstQuery);
  const pickedByUser = useRef(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const covers = useCoverSearch();
  const { search } = covers;

  useEffect(() => {
    if (firstQuery === handledQuery.current) return;
    const timer = setTimeout(async () => {
      handledQuery.current = firstQuery;
      // A pick made for the previous first destination doesn't carry over to a new one.
      pickedByUser.current = false;
      setActive(0);
      if (!firstQuery) return onChange(null);
      const result = await search(destinations[0]);
      if (!pickedByUser.current)
        onChange(result.status === "ok" ? toCover(result.images[0]) : null);
    }, AUTO_SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // Keyed on the first destination's query only — adding a second country doesn't re-search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstQuery]);

  function openPicker() {
    setOpen(true);
    const index = Math.min(active, Math.max(destinations.length - 1, 0));
    if (destinations[index]) void search(destinations[index]);
  }

  function choose(cover: TripCover | null) {
    pickedByUser.current = true;
    onChange(cover);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{dict.coverTitle}</p>
      <div className="relative aspect-[16/7] overflow-hidden rounded-2xl">
        <TripCoverImage
          src={value?.url}
          alt={value?.alt || dict.defaultCover}
          sizes="(max-width: 760px) 100vw, 720px"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
          {value ? (
            <CoverAttribution
              cover={value}
              template={dict.photoBy}
              className="text-white/90"
            />
          ) : (
            <span className="text-xs">{dict.defaultCover}</span>
          )}
          <button
            type="button"
            onClick={() => (open ? setOpen(false) : openPicker())}
            disabled={destinations.length === 0}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-60"
          >
            <ImageIcon aria-hidden className="size-3.5" />
            {open ? dict.coverDone : value ? dict.changeCover : dict.findCover}
          </button>
        </div>
      </div>
      {covers.loading && !open && (
        <p className="text-muted-foreground text-xs">{dict.coverLoading}</p>
      )}
      {open && (
        <CoverPickerPanel
          destinations={destinations}
          active={Math.min(active, Math.max(destinations.length - 1, 0))}
          onActiveChange={(i) => {
            setActive(i);
            void search(destinations[i]);
          }}
          loading={covers.loading}
          result={covers.result}
          selectedUrl={value?.url ?? null}
          onSelect={(image) => choose(toCover(image))}
          onUseDefault={() => choose(null)}
        />
      )}
    </div>
  );
}
