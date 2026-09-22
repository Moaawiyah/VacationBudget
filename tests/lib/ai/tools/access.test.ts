import { describe, expect, it } from "vitest";
import { requireTrip } from "@/lib/ai/tools/access";
import { ToolError, type ToolContext } from "@/lib/ai/tools/types";

function ctxWithTrip(trip: unknown): ToolContext {
  return { sdk: { trips: { get: async () => trip } } as never, userId: "user-1" };
}

describe("requireTrip", () => {
  it("returns the trip when sdk.trips.get (RLS-scoped) resolves it", async () => {
    const trip = { id: "trip-1", name: "Italy" };
    expect(await requireTrip(ctxWithTrip(trip), "trip-1")).toBe(trip);
  });

  it("throws a not_found ToolError when the trip is null — nonexistent and someone else's trip look identical", async () => {
    const error = await requireTrip(ctxWithTrip(null), "trip-1").catch((e) => e);
    expect(error).toBeInstanceOf(ToolError);
    expect(error.code).toBe("not_found");
  });
});
