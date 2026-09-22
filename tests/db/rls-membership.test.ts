import { beforeEach, describe, expect, it } from "vitest";
import { asUser, errorCode } from "./harness";
import {
  MEMBER,
  OTHER_TRIP,
  OWNER,
  sharedTripScenario,
  STRANGER,
  TRIP,
  type Scenario,
} from "./fixture";

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

const tripsVisibleTo = async (userId: string) =>
  (
    await asUser(s.db, userId, () =>
      s.db.query<{ id: string }>("select id from public.trips order by id"),
    )
  ).rows.map((r) => r.id);

describe("trip sharing: invite → accept → access", () => {
  it("owner and accepted member see the shared trip; a stranger sees nothing", async () => {
    expect(await tripsVisibleTo(OWNER)).toEqual([TRIP, OTHER_TRIP]);
    expect(await tripsVisibleTo(MEMBER)).toEqual([TRIP]);
    expect(await tripsVisibleTo(STRANGER)).toEqual([]);
  });

  it("an invitee can't turn their invitation into access to a different trip", async () => {
    // The 0008 policy let an invitee rewrite trip_id on their own row.
    const code = await errorCode(() =>
      asUser(s.db, MEMBER, () =>
        s.db.query("update public.trip_members set trip_id = $1 where user_id = $2", [
          OTHER_TRIP,
          MEMBER,
        ]),
      ),
    );
    expect(code).toBe("42501");
    expect(await tripsVisibleTo(MEMBER)).toEqual([TRIP]);
  });

  it("nobody but the invitee can accept an invitation", async () => {
    await asUser(s.db, OWNER, () =>
      s.db.query(
        "insert into public.trip_members (trip_id, user_id, invited_by) values ($1, $2, $3)",
        [OTHER_TRIP, STRANGER, OWNER],
      ),
    );
    const byOwner = await asUser(s.db, OWNER, () =>
      s.db.query(
        "update public.trip_members set status = 'accepted' where user_id = $1",
        [STRANGER],
      ),
    );
    expect(byOwner.affectedRows).toBe(0);
    expect(await tripsVisibleTo(STRANGER)).toEqual([]);
  });

  it("an owner can't force someone into a trip as already-accepted", async () => {
    const code = await errorCode(() =>
      asUser(s.db, OWNER, () =>
        s.db.query(
          "insert into public.trip_members (trip_id, user_id, invited_by, status) values ($1, $2, $3, 'accepted')",
          [OTHER_TRIP, STRANGER, OWNER],
        ),
      ),
    );
    expect(code).toBe("42501");
  });

  it("only the owner can invite", async () => {
    const code = await errorCode(() =>
      asUser(s.db, MEMBER, () =>
        s.db.query(
          "insert into public.trip_members (trip_id, user_id, invited_by) values ($1, $2, $3)",
          [TRIP, STRANGER, MEMBER],
        ),
      ),
    );
    expect(code).toBe("42501");
  });

  it("the membership helpers no longer answer questions about other users", async () => {
    const { rows } = await asUser(s.db, STRANGER, () =>
      s.db.query<{ answer: boolean }>(
        "select public.is_trip_participant($1, $2) as answer",
        [TRIP, MEMBER],
      ),
    );
    expect(rows[0].answer).toBe(false);
  });
});

describe("owner-only actions", () => {
  it("a member can read planned budgets but not write them", async () => {
    const plan = (userId: string) =>
      asUser(s.db, userId, () =>
        s.db.query(
          "insert into public.planned_budgets (trip_id, category_id, planned_amount) values ($1, $2, 100)",
          [TRIP, s.systemCategory],
        ),
      );
    expect(await errorCode(() => plan(MEMBER))).toBe("42501");
    expect(await errorCode(() => plan(OWNER))).toBeNull();
    const seen = await asUser(s.db, MEMBER, () =>
      s.db.query("select 1 from public.planned_budgets where trip_id = $1", [TRIP]),
    );
    expect(seen.rows).toHaveLength(1);
  });

  it("a member can't edit or delete the trip", async () => {
    const updated = await asUser(s.db, MEMBER, () =>
      s.db.query("update public.trips set total_budget = 1 where id = $1", [TRIP]),
    );
    const deleted = await asUser(s.db, MEMBER, () =>
      s.db.query("delete from public.trips where id = $1", [TRIP]),
    );
    expect(updated.affectedRows).toBe(0);
    expect(deleted.affectedRows).toBe(0);
  });
});

describe("profiles", () => {
  it("identity columns aren't user-writable; display names are", async () => {
    const email = await errorCode(() =>
      asUser(s.db, MEMBER, () =>
        s.db.query(
          "update public.profiles set email = 'victim@example.test' where id = $1",
          [MEMBER],
        ),
      ),
    );
    const name = await errorCode(() =>
      asUser(s.db, MEMBER, () =>
        s.db.query("update public.profiles set first_name = 'Bea' where id = $1", [
          MEMBER,
        ]),
      ),
    );
    expect(email).toBe("42501");
    expect(name).toBeNull();
  });
});
