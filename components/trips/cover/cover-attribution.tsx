import type { TripCover } from "@/lib/images/cover-schema";
import { cn } from "@/lib/utils";

/**
 * "Photo by Jane Doe on Pexels", as Pexels' API guidelines ask — the name
 * links to the photographer, the rest to the photo's page. `template` is
 * the localized dictionary string containing "{name}". No hooks, so it
 * renders from Server and Client Components alike.
 */
export function CoverAttribution({
  cover,
  template,
  className,
}: {
  cover: Pick<TripCover, "photographer" | "photographerUrl" | "sourceUrl">;
  template: string;
  className?: string;
}) {
  const [before, after = ""] = template.split("{name}");
  const link = "underline-offset-2 hover:underline";
  return (
    <p className={cn("text-[11px] leading-tight", className)}>
      {before}
      <a
        href={cover.photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        {cover.photographer}
      </a>
      <a
        href={cover.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        {after}
      </a>
    </p>
  );
}
