import { describe, expect, it } from "vitest";
import { TripService } from "@/lib/sdk/trip-service";
import { callsOf, createFakeDb, muteErrorLog } from "../helpers/fake-db";
import { tripInput, tripRow } from "../helpers/fixtures";

describe("TripService writes", () => {
  it("creates a trip for the session user with a server-generated id, and returns it", async () => {
    const { db, calls } = createFakeDb({ trips: [{}] });
    const result = await new TripService(db).create("user-1", tripInput);
    const [inserted] = callsOf(calls, "trips", "insert")[0] as [Record<string, unknown>];
    expect(result).toEqual({ id: inserted.id });
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserted).toMatchObject({
      user_id: "user-1",
      name: "Rome",
      description: null,
    });
  });

  it("never reads the new row back (insert ... RETURNING is refused by trips' SELECT policy)", async () => {
    const { db, calls } = createFakeDb({ trips: [{}] });
    await new TripService(db).create("user-1", tripInput);
    expect(callsOf(calls, "trips", "select")).toEqual([]);
    expect(callsOf(calls, "trips", "single")).toEqual([]);
  });

  it("returns and logs the database error when create fails", async () => {
    const log = muteErrorLog();
    const { db } = createFakeDb({ trips: [{ error: { message: "insert denied" } }] });
    const result = await new TripService(db).create("user-1", tripInput);
    expect(result).toMatchObject({ code: "unknown" });
    expect(JSON.stringify(result)).not.toContain("insert denied");
    expect(log.mock.calls[0]?.[0]).toContain("insert denied");
    expect(log.mock.calls[0]?.[0]).toContain('"message":"trips.create failed"');
  });

  it("scopes update and delete to the owner", async () => {
    const hit = { data: [{ id: "trip-1" }] };
    const { db, calls } = createFakeDb({ trips: [hit, hit] });
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
    const { db } = createFakeDb({ trips: [failure, failure, { data: [] }] });
    const trips = new TripService(db);
    expect(await trips.update("user-1", "trip-1", tripInput)).toMatchObject({
      code: "unknown",
    });
    expect(await trips.delete("user-1", "trip-1")).toMatchObject({ code: "unknown" });
    // A member (or anyone but the owner) matches zero rows: refused, not "saved".
    expect(await trips.update("user-2", "trip-1", tripInput)).toMatchObject({
      code: "permission_denied",
    });
  });

  it("drops cached reads after a write", async () => {
    const { db, from } = createFakeDb({
      trips: [{ data: tripRow() }, { data: [{ id: "trip-1" }] }, { data: tripRow() }],
    });
    const trips = new TripService(db);
    await trips.get("trip-1");
    await trips.update("user-1", "trip-1", tripInput);
    await trips.get("trip-1");
    expect(from).toHaveBeenCalledTimes(3);
  });
});
