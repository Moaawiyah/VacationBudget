import { afterEach, describe, expect, it, vi } from "vitest";
import { TripService, toTripRow } from "@/lib/sdk/trip-service";
import { callsOf, createFakeDb } from "../helpers/fake-db";
import { tripInput, tripRow } from "../helpers/fixtures";

afterEach(() => vi.restoreAllMocks());

describe("toTripRow", () => {
  it("copies validated fields and turns an empty description into null", () => {
    expect(toTripRow(tripInput)).toEqual({
      name: "Rome",
      description: null,
      destination: "Italy",
      start_date: "2026-10-01",
      end_date: "2026-10-10",
      base_currency: "EUR",
      total_budget: 1500,
    });
  });
});

describe("TripService.get", () => {
  it("maps the row (numeric budget) and caches the read per instance", async () => {
    const { db, from } = createFakeDb({ trips: [{ data: tripRow() }] });
    const trips = new TripService(db);

    const first = await trips.get("trip-1");
    const second = await trips.get("trip-1");

    expect(first?.total_budget).toBe(1500);
    expect(second).toBe(first);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("returns null when the trip doesn't exist (or isn't the user's)", async () => {
    const { db } = createFakeDb();
    expect(await new TripService(db).get("missing")).toBeNull();
  });
});

describe("TripService.listWithSpent", () => {
  it("returns [] with a single query when the user has no trips", async () => {
    const { db, from } = createFakeDb({ trips: [{ data: [] }] });
    expect(await new TripService(db).listWithSpent("user-1")).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("sums converted spend per trip in one extra query", async () => {
    const { db, calls } = createFakeDb({
      trips: [
        {
          data: [tripRow(), tripRow({ id: "trip-2", name: "Oslo", user_id: "user-2" })],
        },
      ],
      expenses: [
        {
          data: [
            { trip_id: "trip-1", converted_amount: "10.50" },
            { trip_id: "trip-1", converted_amount: "4.50" },
          ],
        },
      ],
    });

    const result = await new TripService(db).listWithSpent("user-1");

    expect(result.map((r) => [r.trip.id, r.spent, r.isOwner])).toEqual([
      ["trip-1", 15, true],
      ["trip-2", 0, false],
    ]);
    expect(callsOf(calls, "trips", "eq")).toEqual([]);
    expect(callsOf(calls, "expenses", "in")).toEqual([["trip_id", ["trip-1", "trip-2"]]]);
  });
});

describe("TripService ownership", () => {
  it("returns the base currency only for the owner's trip", async () => {
    const { db, calls } = createFakeDb({
      trips: [{ data: { base_currency: "USD" } }, {}],
    });
    const trips = new TripService(db);

    expect(await trips.ownedBaseCurrency("user-1", "trip-1")).toBe("USD");
    expect(await trips.isOwnedBy("user-2", "trip-1")).toBe(false);
    expect(callsOf(calls, "trips", "eq")).toContainEqual(["user_id", "user-2"]);
  });
});
