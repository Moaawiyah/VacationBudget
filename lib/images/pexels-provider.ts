import { z } from "zod";
import { tripCoverSchema } from "./cover-schema";
import {
  ImageProviderError,
  type DestinationImage,
  type DestinationImageProvider,
} from "./types";

const PEXELS_IMAGE_HOST = "images.pexels.com";
// Fixed size parameters: the stored URL must match next.config.ts's
// remotePatterns (and 0018's check) exactly, so they're built here from the
// photo's path rather than trusted from the response as-is.
export const PEXELS_COVER_QUERY = "?auto=compress&cs=tinysrgb&w=1600";
export const PEXELS_THUMBNAIL_QUERY = "?auto=compress&cs=tinysrgb&w=600";

const photoSchema = z.object({
  url: z.string().url(),
  photographer: z.string().min(1).max(120),
  photographer_url: z.string().url(),
  alt: z.string().nullish(),
  src: z.object({ original: z.string().url() }),
});
const searchResponseSchema = z.object({ photos: z.array(z.unknown()) });

/** "https://images.pexels.com/photos/123/pexels-photo-123.jpeg" — or null if it isn't one. */
export function pexelsPhotoPath(original: string): string | null {
  const url = new URL(original);
  if (url.protocol !== "https:" || url.hostname !== PEXELS_IMAGE_HOST) return null;
  return /^\/photos\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname)
    ? `https://${PEXELS_IMAGE_HOST}${url.pathname}`
    : null;
}

function toDestinationImage(raw: unknown): DestinationImage | null {
  const parsed = photoSchema.safeParse(raw);
  if (!parsed.success) return null;
  const photo = parsed.data;
  const path = pexelsPhotoPath(photo.src.original);
  if (!path) return null;
  const image: DestinationImage = {
    url: path + PEXELS_COVER_QUERY,
    thumbnailUrl: path + PEXELS_THUMBNAIL_QUERY,
    alt: (photo.alt ?? "").trim().slice(0, 300),
    provider: "pexels",
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    sourceUrl: photo.url,
  };
  // Offer only photos that would pass the save-time check (cover-schema.ts),
  // so picking one can never fail later.
  return tripCoverSchema.safeParse(image).success ? image : null;
}

/**
 * Pexels photo search (https://www.pexels.com/api/documentation/). The
 * request carries the search query and nothing else about the user; the key
 * goes in the Authorization header, server-side only.
 */
export class PexelsProvider implements DestinationImageProvider {
  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs = 8_000,
    private readonly baseUrl = "https://api.pexels.com/v1",
  ) {}

  async searchDestination(query: string, count: number): Promise<DestinationImage[]> {
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      orientation: "landscape",
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: { Authorization: this.apiKey },
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      throw new ImageProviderError(
        timedOut ? "timeout" : "unavailable",
        timedOut ? "Pexels timed out" : "Pexels unreachable",
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429)
      throw new ImageProviderError("rate_limited", "Pexels rate limit reached");
    if (response.status === 401 || response.status === 403)
      throw new ImageProviderError(
        "rejected",
        `Pexels refused the key (${response.status})`,
      );
    if (!response.ok)
      throw new ImageProviderError("unavailable", `Pexels returned ${response.status}`);

    const body = searchResponseSchema.safeParse(await response.json().catch(() => null));
    if (!body.success)
      throw new ImageProviderError("malformed", "Pexels response had no photo list");
    // One odd photo shouldn't sink the whole result — skip it, keep the rest.
    return body.data.photos
      .map(toDestinationImage)
      .filter((p): p is DestinationImage => p !== null);
  }
}
