import { beforeEach, describe, expect, it } from "vitest";
import { asUser, errorCode } from "./harness";
import {
  addSplitExpense,
  MEMBER,
  OTHER_MEMBER,
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

/** A €30 equal split across OWNER/MEMBER/OTHER_MEMBER. */
function equalSplit() {
  return [
    { userId: OWNER, shareAmount: 10 },
    { userId: MEMBER, shareAmount: 10 },
    { userId: OTHER_MEMBER, shareAmount: 10 },
  ];
}

describe("expense_splits — read access follows the expense", () => {
  it("every trip participant can see the split; a stranger sees nothing", async () => {
    const id = await addSplitExpense(s.db, OWNER, s.systemCategory, {
      amount: 30,
      splits: equalSplit(),
    });
    for (const user of [OWNER, MEMBER, OTHER_MEMBER]) {
      const { rows } = await asUser(s.db, user, () =>
        s.db.query("select user_id from public.expense_splits where expense_id = $1", [id]),
      );
      expect(rows).toHaveLength(3);
    }
    const { rows } = await asUser(s.db, STRANGER, () =>
      s.db.query("select user_id from public.expense_splits where expense_id = $1", [id]),
    );
    expect(rows).toHaveLength(0);
  });
});

describe("expense_splits — write authorization", () => {
  it("a member who is neither author nor payer cannot edit another share", async () => {
    const id = await addSplitExpense(s.db, OWNER, s.systemCategory, {
      amount: 30,
      splits: equalSplit(),
    });
    const result = await asUser(s.db, OTHER_MEMBER, () =>
      s.db.query(
        "update public.expense_splits set share_amount = 15 where expense_id = $1 and user_id = $2",
        [id, MEMBER],
      ),
    );
    expect(result.affectedRows).toBe(0);
  });

  // The balanced-shares check runs at commit against every row of the
  // expense, so a legitimate edit moves money between two rows in one
  // transaction — exactly what update_expense does by replacing the set.
  async function transferShare(
    db: Scenario["db"],
    as: string,
    expenseId: string,
    from: string,
    to: string,
    amount: number,
  ) {
    return asUser(db, as, async () => {
      await db.exec("begin");
      try {
        await db.query(
          "update public.expense_splits set share_amount = share_amount - $3 where expense_id = $1 and user_id = $2",
          [expenseId, from, amount],
        );
        await db.query(
          "update public.expense_splits set share_amount = share_amount + $3 where expense_id = $1 and user_id = $2",
          [expenseId, to, amount],
        );
        await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        throw error;
      }
    });
  }

  it("the payer (not the author) may modify the split", async () => {
    const id = await addSplitExpense(s.db, OWNER, s.systemCategory, {
      amount: 30,
      paidBy: MEMBER,
      splitMethod: "exact",
      splits: equalSplit(),
    });
    await transferShare(s.db, MEMBER, id, OWNER, OTHER_MEMBER, 5);
    const { rows } = await asUser(s.db, OWNER, () =>
      s.db.query<{ share_amount: string }>(
        "select share_amount from public.expense_splits where expense_id = $1 and user_id = $2",
        [id, OTHER_MEMBER],
      ),
    );
    expect(Number(rows[0].share_amount)).toBe(15);
  });

  it("the trip owner may modify anyone's split", async () => {
    const id = await addSplitExpense(s.db, MEMBER, s.systemCategory, {
      amount: 30,
      splitMethod: "exact",
      splits: equalSplit(),
    });
    await transferShare(s.db, OWNER, id, MEMBER, OTHER_MEMBER, 9);
    const { rows } = await asUser(s.db, OWNER, () =>
      s.db.query<{ share_amount: string }>(
        "select share_amount from public.expense_splits where expense_id = $1 and user_id = $2",
        [id, MEMBER],
      ),
    );
    expect(Number(rows[0].share_amount)).toBe(1);
  });

  it("a stranger cannot insert a split row on someone else's expense", async () => {
    const id = await addSplitExpense(s.db, OWNER, s.systemCategory, {
      amount: 30,
      splits: equalSplit(),
    });
    const code = await errorCode(() =>
      asUser(s.db, STRANGER, () =>
        s.db.query(
          "insert into public.expense_splits (expense_id, user_id, share_amount) values ($1, $2, 0)",
          [id, STRANGER],
        ),
      ),
    );
    expect(code).not.toBeNull();
  });
});

describe("create_expense — participant and idempotency", () => {
  it("rejects a payer who is not a trip participant", async () => {
    const code = await errorCode(() =>
      addSplitExpense(s.db, OWNER, s.systemCategory, {
        amount: 30,
        paidBy: STRANGER,
        splits: [{ userId: OWNER, shareAmount: 30 }],
      }),
    );
    expect(code).toBe("VB006");
  });

  it("a repeated request id returns the same expense instead of duplicating it", async () => {
    const requestId = "33333333-3333-3333-3333-333333333333";
    const first = await addSplitExpense(s.db, MEMBER, s.systemCategory, {
      amount: 30,
      splits: [{ userId: MEMBER, shareAmount: 30 }],
      requestId,
    });
    const second = await addSplitExpense(s.db, MEMBER, s.systemCategory, {
      amount: 30,
      splits: [{ userId: MEMBER, shareAmount: 30 }],
      requestId,
    });
    expect(second).toBe(first);
    const { rows } = await asUser(s.db, MEMBER, () =>
      s.db.query("select id from public.expenses where trip_id = $1", [TRIP]),
    );
    expect(rows).toHaveLength(1);
  });
});
