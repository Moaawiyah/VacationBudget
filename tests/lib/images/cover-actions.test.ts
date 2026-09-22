import { describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => vi.fn(async () => ({ status: "empty" as const })));
vi.mock("@/lib/sdk/server", () => ({ requireUser: async () => ({ user: { id: "user-rl" } }) }));
vi.mock("@/lib/images/cover-search", () => ({
  getDestinationImageProvider: () => null,
  searchDestinationCovers: search,
}));

const { searchTripCovers } = await import("@/app/trips/cover-actions");

describe("searchTripCovers (Server Action)", () => {
  it("never reaches the provider with malformed input", async () => {
    expect(await searchTripCovers({ country: "" })).toEqual({ status: "empty" });
    expect(await searchTripCovers("Switzerland")).toEqual({ status: "empty" });
    expect(await searchTripCovers({ country: "x".repeat(101) })).toEqual({ status: "empty" });
    expect(search).not.toHaveBeenCalled();
  });

  it("passes only the destination on — no user, trip or budget data", async () => {
    await searchTripCovers({ country: "Switzerland", city: "Interlaken" });
    expect(search).toHaveBeenCalledWith(null, { country: "Switzerland", city: "Interlaken" });
  });

  it("rate-limits one user so they can't exhaust the shared API quota", async () => {
    for (let i = 0; i < 40; i++) await searchTripCovers({ country: "Italy" });
    expect(await searchTripCovers({ country: "Italy" })).toEqual({
      status: "unavailable",
      reason: "rate_limited",
    });
  });
});
