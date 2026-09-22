import { beforeEach, describe, expect, it } from "vitest";
import { asUser, errorCode } from "./harness";
import {
  addExpense,
  MEMBER,
  OWNER,
  sharedTripScenario,
  TRIP,
  type Scenario,
} from "./fixture";

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

async function amounts(expenseId: string) {
  const { rows } = await s.db.query<{ exchange_rate: string; converted_amount: string }>(
    "select exchange_rate, converted_amount from public.expenses where id = $1",
    [expenseId],
  );
  return {
    rate: Number(rows[0].exchange_rate),
    converted: Number(rows[0].converted_amount),
  };
}

describe("database-derived amounts", () => {
  it("ignores a client-sent converted_amount and derives it", async () => {
    // addExpense deliberately sends converted_amount = 0.
    const id = await addExpense(s.db, MEMBER, s.systemCategory, {
      amount: 10,
      currency: "USD",
      rate: 0.9,
    });
    expect(await amounts(id)).toEqual({ rate: 0.9, converted: 9 });
  });

  it("forces a same-currency expense to convert at 1", async () => {
    const id = await addExpense(s.db, MEMBER, s.systemCategory, { amount: 12, rate: 7 });
    expect(await amounts(id)).toEqual({ rate: 1, converted: 12 });
  });

  it("re-derives the converted amount on update", async () => {
    const id = await addExpense(s.db, MEMBER, s.systemCategory, {
      amount: 10,
      currency: "USD",
      rate: 2,
    });
    await asUser(s.db, MEMBER, async () => {
      // The split must move with the amount in the same transaction, or the
      // deferred balanced-shares check rejects the update at commit.
      await s.db.exec("begin");
      await s.db.query(
        "update public.expenses set amount = 5, converted_amount = 999 where id = $1",
        [id],
      );
      await s.db.query(
        "update public.expense_splits set share_amount = 5 where expense_id = $1",
        [id],
      );
      await s.db.exec("commit");
    });
    expect(await amounts(id)).toEqual({ rate: 2, converted: 10 });
  });
});

describe("trip base currency", () => {
  const changeCurrency = () =>
    asUser(s.db, OWNER, () =>
      s.db.query("update public.trips set base_currency = 'USD' where id = $1", [TRIP]),
    );

  it("can change while the trip has no expenses", async () => {
    expect(await errorCode(changeCurrency)).toBeNull();
  });

  it("is locked once expenses exist, since every conversion depends on it", async () => {
    await addExpense(s.db, MEMBER, s.systemCategory);
    expect(await errorCode(changeCurrency)).toBe("VB001");
  });
});

describe("idempotent creation", () => {
  // A duplicate request id fails the INSERT itself (unique violation, not
  // deferred), so only the transaction that's expected to succeed needs a
  // matching split row to clear the balanced-shares check at commit.
  const insertWithRequestId = (userId: string, requestId: string) =>
    asUser(s.db, userId, async () => {
      await s.db.exec("begin");
      try {
        const { rows } = await s.db.query<{ id: string }>(
          `insert into public.expenses (trip_id, user_id, category_id, amount, currency,
             exchange_rate, converted_amount, description, expense_date, client_request_id)
           values ($1, $2, $3, 20, 'EUR', 1, 20, 'Lunch', '2026-06-02', $4)
           returning id`,
          [TRIP, userId, s.systemCategory, requestId],
        );
        await s.db.query(
          "insert into public.expense_splits (expense_id, user_id, share_amount) values ($1, $2, 20)",
          [rows[0].id, userId],
        );
        await s.db.exec("commit");
      } catch (error) {
        await s.db.exec("rollback");
        throw error;
      }
    });
  const REQUEST = "11111111-1111-1111-1111-111111111111";

  it("a repeated request id is rejected instead of creating a second expense", async () => {
    await insertWithRequestId(MEMBER, REQUEST);
    expect(await errorCode(() => insertWithRequestId(MEMBER, REQUEST))).toBe("23505");
    const { rows } = await s.db.query(
      "select 1 from public.expenses where client_request_id = $1",
      [REQUEST],
    );
    expect(rows).toHaveLength(1);
  });

  it("request ids are scoped per user", async () => {
    await insertWithRequestId(MEMBER, REQUEST);
    expect(await errorCode(() => insertWithRequestId(OWNER, REQUEST))).toBeNull();
  });
});

describe("length limits mirror the app's validation", () => {
  it("rejects an over-long description even via direct API", async () => {
    const code = await errorCode(() =>
      asUser(s.db, MEMBER, () =>
        s.db.query(
          `insert into public.expenses (trip_id, user_id, category_id, amount, currency,
             exchange_rate, converted_amount, description, expense_date)
           values ($1, $2, $3, 20, 'EUR', 1, 20, $4, '2026-06-02')`,
          [TRIP, MEMBER, s.systemCategory, "x".repeat(201)],
        ),
      ),
    );
    expect(code).toBe("23514");
  });
});
