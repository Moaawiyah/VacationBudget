"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import type { DestinationImage } from "@/lib/images/types";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

/** The 2×3 grid of candidate covers (thumbnail-sized images only). */
export function CoverGrid({
  images,
  selectedUrl,
  onSelect,
  labelTemplate,
}: {
  images: DestinationImage[];
  selectedUrl: string | null;
  onSelect: (image: DestinationImage) => void;
  labelTemplate: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((image, i) => {
        const selected = image.url === selectedUrl;
        return (
          <button
            key={image.url}
            type="button"
            onClick={() => onSelect(image)}
            aria-pressed={selected}
            aria-label={image.alt || interpolate(labelTemplate, { n: i + 1 })}
            className={cn(
              "bg-muted relative aspect-[4/3] overflow-hidden rounded-xl ring-offset-2 transition",
              selected ? "ring-primary ring-2" : "hover:opacity-90",
            )}
          >
            <Image
              src={image.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              className="object-cover"
            />
            {selected && (
              <span className="bg-primary text-primary-foreground absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full">
                <Check aria-hidden className="size-4" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CoverGridSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="bg-muted aspect-[4/3] animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
