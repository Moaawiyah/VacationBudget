/**
 * The app's own default cover — public/alpine-lake.jpg, already in the
 * project with its source recorded in public/ASSETS.md. Used whenever a trip
 * has no chosen cover, the provider is unavailable, or a stored cover image
 * later fails to load. Its own module so client components can import it
 * without pulling in the server-side search code.
 */
export const FALLBACK_COVER_SRC = "/alpine-lake.jpg";
