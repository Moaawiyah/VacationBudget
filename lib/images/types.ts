/**
 * A destination photo, in the provider-neutral shape the rest of the app
 * uses. Everything the provider's terms ask us to keep (photographer,
 * their page, the photo's page) travels with the image.
 */
export type DestinationImage = {
  /** Cover-sized URL — what gets stored on the trip. */
  url: string;
  /** Small URL for the picker grid only; never stored. */
  thumbnailUrl: string;
  alt: string;
  provider: "pexels";
  photographer: string;
  photographerUrl: string;
  /** The photo's own page on the provider's site. */
  sourceUrl: string;
};

/** Why a search produced nothing — each maps to "use the default cover", never to a thrown error. */
export type ImageSearchFailure =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "rejected"
  | "unavailable"
  | "malformed";

export class ImageProviderError extends Error {
  constructor(
    readonly kind: Exclude<ImageSearchFailure, "not_configured">,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Travel photography, behind an interface so the trip UI never knows which
 * company supplies it (see pexels-provider.ts for the one implementation).
 * Receives only a search query string — never anything about the user,
 * their trip, budget or companions.
 */
export interface DestinationImageProvider {
  searchDestination(query: string, count: number): Promise<DestinationImage[]>;
}
