import type { Trip } from "@/types/trip";
import { ToolError, type ToolContext } from "./types";

/**
 * Every tool calls this first — an independent, explicit access check, on
 * top of (never instead of) the RLS that already scopes every query
 * `ctx.sdk` makes. `sdk.trips.get` returns null for a trip the signed-in
 * user can't see, whether it doesn't exist or simply isn't theirs; either
 * way the tool must fail the same way, so a bad tripId can't be used to
 * probe for which trip ids exist.
 */
export async function requireTrip(ctx: ToolContext, tripId: string): Promise<Trip> {
  const trip = await ctx.sdk.trips.get(tripId);
  if (!trip) throw new ToolError("not_found", "That trip isn't accessible");
  return trip;
}
