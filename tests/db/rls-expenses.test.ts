import { beforeEach, describe, expect, it } from "vitest";
import { asUser, errorCode } from "./harness";
import {
  addExpense,
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

async function descriptionOf(expenseId: string) {
  const { rows } = await s.db.query<{ description: string }>(
    "select description from public.expenses where id = $1",
    [expenseId],
  );
  return rows[0]?.description;
}

describe("expense RLS — cross-user modification", () => {
  it("a member cannot edit the owner's expense", async () => {
    const ownerExpense = await addExpense(s.db, OWNER, s.systemCategory);
    const result = await asUser(s.db, MEMBER, () =>
      s.db.query("update public.expenses set description = 'hijacked' where id = $1", [
        ownerExpense,
      ]),
    );
    expect(result.affectedRows).toBe(0);
    expect(await descriptionOf(ownerExpense)).toBe("Lunch");
  });

  it("a member cannot delete the owner's expense", async () => {
    const ownerExpense = await addExpense(s.db, OWNER, s.systemCategory);
    const result = await asUser(s.db, MEMBER, () =>
      s.db.query("delete from public.expenses where id = $1", [ownerExpense]),
    );
    expect(result.affectedRows).toBe(0);
    expect(await descriptionOf(ownerExpense)).toBe("Lunch");
  });

  it("a member can edit and delete their own expense", async () => {
    const own = await addExpense(s.db, MEMBER, s.systemCategory);
    await asUser(s.db, MEMBER, () =>
      s.db.query("update public.expenses set description = 'Dinner' where id = $1", [
        own,
      ]),
    );
    expect(await descriptionOf(own)).toBe("Dinner");
    await asUser(s.db, MEMBER, () =>
      s.db.query("delete from public.expenses where id = $1", [own]),
    );
    expect(await descriptionOf(own)).toBeUndefined();
  });

  it("the trip owner can edit and delete a member's expense", async () => {
    const memberExpense = await addExpense(s.db, MEMBER, s.systemCategory);
    await asUser(s.db, OWNER, () =>
      s.db.query("update public.expenses set description = 'Fixed' where id = $1", [
        memberExpense,
      ]),
    );
    expect(await descriptionOf(memberExpense)).toBe("Fixed");
    const deleted = await asUser(s.db, OWNER, () =>
      s.db.query("delete from public.expenses where id = $1", [memberExpense]),
    );
    expect(deleted.affectedRows).toBe(1);
  });

  it("a member cannot hand their expense to someone else or move it", async () => {
    const own = await addExpense(s.db, MEMBER, s.systemCategory);
    const reassign = await errorCode(() =>
      asUser(s.db, MEMBER, () =>
        s.db.query("update public.expenses set user_id = $1 where id = $2", [OWNER, own]),
      ),
    );
    const move = await errorCode(() =>
      asUser(s.db, MEMBER, () =>
        s.db.query("update public.expenses set trip_id = $1 where id = $2", [
          OTHER_TRIP,
          own,
        ]),
      ),
    );
    expect(reassign).not.toBeNull();
    expect(move).not.toBeNull();
  });
});

describe("expense RLS — access from outside the trip", () => {
  it("a stranger can neither see nor add expenses", async () => {
    await addExpense(s.db, OWNER, s.systemCategory);
    const visible = await asUser(s.db, STRANGER, () =>
      s.db.query("select id from public.expenses where trip_id = $1", [TRIP]),
    );
    expect(visible.rows).toHaveLength(0);
    expect(await errorCode(() => addExpense(s.db, STRANGER, s.systemCategory))).toBe(
      "42501",
    );
  });

  it("a member can't attach a stranger's private category", async () => {
    const strangerCategory = await asUser(s.db, STRANGER, async () => {
      const { rows } = await s.db.query<{ id: string }>(
        "insert into public.categories (user_id, name, icon) values ($1, 'Mine', 'tag') returning id",
        [STRANGER],
      );
      return rows[0].id;
    });
    expect(await errorCode(() => addExpense(s.db, MEMBER, strangerCategory))).toBe(
      "42501",
    );
  });
});
