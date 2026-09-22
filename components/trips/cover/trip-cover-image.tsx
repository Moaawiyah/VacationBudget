"use client";

import Image from "next/image";
import { useState } from "react";
import { FALLBACK_COVER_SRC } from "@/lib/images/fallback";
import { cn } from "@/lib/utils";

/**
 * A trip's cover, filling its (relative, overflow-hidden) parent. Shows a
 * skeleton until the image loads, and swaps to the app's default cover if
 * there's no stored cover or it fails to load (e.g. the photo was later
 * removed from the provider). Renders only what's already stored — it never
 * searches for anything.
 */
export function TripCoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const effective = src && src !== failedSrc ? src : FALLBACK_COVER_SRC;

  return (
    <>
      {loadedSrc !== effective && (
        <div aria-hidden className="bg-muted absolute inset-0 animate-pulse" />
      )}
      <Image
        key={effective}
        src={effective}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
        onLoad={() => setLoadedSrc(effective)}
        onError={() => {
          if (effective !== FALLBACK_COVER_SRC) setFailedSrc(effective);
        }}
      />
    </>
  );
}
