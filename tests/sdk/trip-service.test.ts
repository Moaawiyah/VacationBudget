import { afterEach, describe, expect, it, vi } from "vitest";
import { TripService, toTripRow } from "@/lib/sdk/trip-service";
import { callsOf, createFakeDb, muteErrorLog } from "../helpers/fake-db";
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
      trips: [{ data: [tripRow(), tripRow({ id: "trip-2", name: "Oslo" })] }],
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

    expect(result.map((r) => [r.trip.id, r.spent])).toEqual([
      ["trip-1", 15],
      ["trip-2", 0],
    ]);
    expect(callsOf(calls, "trips", "eq")).toContainEqual(["user_id", "user-1"]);
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

describe("TripService writes", () => {
  it("creates a trip for the session user and returns its id", async () => {
    const { db, calls } = createFakeDb({ trips: [{ data: { id: "new-trip" } }] });
    expect(await new TripService(db).create("user-1", tripInput)).toEqual({
      id: "new-trip",
    });
    const [inserted] = callsOf(calls, "trips", "insert")[0] as [Record<string, unknown>];
    expect(inserted).toMatchObject({
      user_id: "user-1",
      name: "Rome",
      description: null,
    });
  });

  it("returns and logs the database error when create fails", async () => {
    const log = muteErrorLog();
    const { db } = createFakeDb({ trips: [{ error: { message: "insert denied" } }] });
    expect(await new TripService(db).create("user-1", tripInput)).toEqual({
      error: "insert denied",
    });
    expect(log.mock.calls[0]?.[0]).toContain('"message":"trips.create failed"');
  });

  it("reports a create that returned no row", async () => {
    muteErrorLog();
    const { db } = createFakeDb();
    expect(await new TripService(db).create("user-1", tripInput)).toEqual({
      error: "No trip returned",
    });
  });

  it("scopes update and delete to the owner", async () => {
    const { db, calls } = createFakeDb();
    const trips = new TripService(db);
    expect(await trips.update("user-1", "trip-1", tripInput)).toEqual({});
    expect(await trips.delete("user-1", "trip-1")).toEqual({});
    expect(callsOf(calls, "trips", "eq")).toEqual([
      ["id", "trip-1"],
      ["user_id", "user-1"],
      ["id", "trip-1"],
      ["user_id", "user-1"],
    ]);
  });

  it("returns errors from update and delete", async () => {
    muteErrorLog();
    const failure = { error: { message: "nope" } };
    const { db } = createFakeDb({ trips: [failure, failure] });
    const trips = new TripService(db);
    expect(await trips.update("user-1", "trip-1", tripInput)).toEqual({ error: "nope" });
    expect(await trips.delete("user-1", "trip-1")).toEqual({ error: "nope" });
  });

  it("drops cached reads after a write", async () => {
    const { db, from } = createFakeDb({
      trips: [{ data: tripRow() }, {}, { data: tripRow() }],
    });
    const trips = new TripService(db);
    await trips.get("trip-1");
    await trips.update("user-1", "trip-1", tripInput);
    await trips.get("trip-1");
    expect(from).toHaveBeenCalledTimes(3);
  });
});
