import { describe, expect, it } from "vitest";
import { asUser, createDb, createUser, errorCode, uid } from "./harness";

const NEW_USER = uid(0x77);
const TRIP_ID = uid(0x777);
const INSERT = `insert into public.trips
  (id, user_id, name, destination, start_date, end_date, base_currency, total_budget)
  values ($1, $2, 'First trip', 'Italy', '2026-06-01', '2026-06-05', 'EUR', 500)`;

describe("creating a trip as a brand-new user (TripService.create's exact write)", () => {
  it("succeeds with a client-generated id and no RETURNING, and the owner can then read it", async () => {
    const db = await createDb();
    await createUser(db, NEW_USER, "newbie");
    expect(await errorCode(() => asUser(db, NEW_USER, () => db.query(INSERT, [TRIP_ID, NEW_USER])))).toBeNull();
    const { rows } = await asUser(db, NEW_USER, () =>
      db.query<{ id: string }>("select id from public.trips where id = $1", [TRIP_ID]),
    );
    expect(rows).toEqual([{ id: TRIP_ID }]);
  });

  it("documents why: insert ... RETURNING is refused by trips' SELECT policy (42501)", async () => {
    // is_trip_participant can't see the row being inserted, so the SELECT
    // policy check RETURNING triggers fails. If this ever starts passing
    // (e.g. the policy gains an `auth.uid() = user_id` short-circuit),
    // TripService.create could go back to reading the id back.
    const db = await createDb();
    await createUser(db, NEW_USER, "newbie");
    const code = await errorCode(() =>
      asUser(db, NEW_USER, () => db.query(`${INSERT} returning id`, [TRIP_ID, NEW_USER])),
    );
    expect(code).toBe("42501");
  });

  it("still refuses a trip created on someone else's behalf", async () => {
    const db = await createDb();
    await createUser(db, NEW_USER, "newbie");
    const victim = uid(0x78);
    await createUser(db, victim, "victim");
    const code = await errorCode(() => asUser(db, NEW_USER, () => db.query(INSERT, [TRIP_ID, victim])));
    expect(code).toBe("42501");
  });
});
