"use server";

import { z } from "zod";
import { requireUser } from "@/lib/sdk/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  getDestinationImageProvider,
  searchDestinationCovers,
  type CoverSearchResult,
} from "@/lib/images/cover-search";

// Per user, on top of cover-search.ts's shared per-query cache: Pexels'
// free tier is 200 requests/hour for the whole app, so no one account may
// burn through it by flipping destinations.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 10 * 60_000;

const destinationSchema = z.object({
  city: z.string().max(100).optional(),
  country: z.string().trim().min(1).max(100),
});

/**
 * Candidate cover photos for one destination, for the trip form's picker.
 * Read-only — choosing one is saved with the trip itself (createTrip /
 * updateTrip, which re-validate it). Sends the provider only the
 * destination's search query: no user, trip, budget or companion data.
 */
export async function searchTripCovers(destination: unknown): Promise<CoverSearchResult> {
  const { user } = await requireUser();
  const parsed = destinationSchema.safeParse(destination);
  if (!parsed.success) return { status: "empty" };
  if (!rateLimit(`covers:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return { status: "unavailable", reason: "rate_limited" };
  }
  return searchDestinationCovers(getDestinationImageProvider(), parsed.data);
}
