import { beforeEach, describe, expect, it } from "vitest";
import { asUser, createUser, errorCode, uid } from "./harness";
import { addSplitExpense, MEMBER, OWNER, sharedTripScenario, type Scenario } from "./fixture";

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

describe("account lifecycle — FK safety net (0017)", () => {
  it("rejects deleting a profile that owns a trip", async () => {
    const code = await errorCode(() =>
      s.db.query("delete from public.profiles where id = $1", [OWNER]),
    );
    expect(code).toBe("23503"); // foreign key violation, not a silent cascade
  });

  it("rejects deleting a profile that authored an expense", async () => {
    await addSplitExpense(s.db, MEMBER, s.systemCategory, {
      amount: 10,
      splits: [{ userId: MEMBER, shareAmount: 10 }],
    });
    const code = await errorCode(() =>
      s.db.query("delete from public.profiles where id = $1", [MEMBER]),
    );
    expect(code).toBe("23503");
  });

  it("a profile with no trips or expenses can still be deleted outright", async () => {
    const lonely = uid(0xf);
    await createUser(s.db, lonely, "lonely");
    const code = await errorCode(() =>
      s.db.query("delete from public.profiles where id = $1", [lonely]),
    );
    expect(code).toBeNull();
  });

  it("tombstoning (an update, never a delete) leaves every reference intact", async () => {
    const id = await addSplitExpense(s.db, MEMBER, s.systemCategory, {
      amount: 10,
      splits: [{ userId: MEMBER, shareAmount: 10 }],
    });
    // The real app does this update with the service-role client
    // (AccountService.deleteAccount) — email/username/deleted_at aren't
    // columns 0009 lets `authenticated` touch on its own.
    await s.db.query(
      `update public.profiles
       set email = $2, username = null, first_name = null, surname = null, deleted_at = now()
       where id = $1`,
      [MEMBER, `deleted-${MEMBER}@deleted.invalid`],
    );
    const { rows } = await asUser(s.db, OWNER, () =>
      s.db.query<{ user_id: string }>(
        "select user_id from public.expenses where id = $1",
        [id],
      ),
    );
    expect(rows[0].user_id).toBe(MEMBER);
  });
});
