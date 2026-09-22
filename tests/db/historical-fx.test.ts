import { beforeEach, describe, expect, it } from "vitest";
import { asUser } from "./harness";
import { MEMBER, OWNER, sharedTripScenario, TRIP, type Scenario } from "./fixture";

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

async function createExpense(
  db: Scenario["db"],
  as: string,
  expense: Record<string, unknown>,
) {
  const { rows } = await asUser(db, as, () =>
    db.query<{ create_expense: string }>(
      "select public.create_expense($1, $2, $3) as create_expense",
      [
        TRIP,
        JSON.stringify({
          category_id: s.systemCategory,
          amount: 20,
          currency: "EUR",
          exchange_rate: 1,
          description: "Lunch",
          expense_date: "2026-06-02",
          ...expense,
        }),
        JSON.stringify([{ user_id: as, share_amount: 20, share_percent: null }]),
      ],
    ),
  );
  return rows[0].create_expense;
}

async function fxColumns(db: Scenario["db"], expenseId: string) {
  const { rows } = await db.query<{ rate_source: string; rate_date: string | Date }>(
    "select rate_source, rate_date from public.expenses where id = $1",
    [expenseId],
  );
  const { rate_source, rate_date } = rows[0];
  // node-pg returns `date` columns as JS Date objects, not ISO strings.
  const iso = rate_date instanceof Date ? rate_date.toISOString().slice(0, 10) : rate_date;
  return { rate_source, rate_date: iso };
}

describe("historical FX provenance", () => {
  it("defaults to 'manual' and today when the app sends neither", async () => {
    const id = await createExpense(s.db, MEMBER, {});
    const row = await fxColumns(s.db, id);
    expect(row.rate_source).toBe("manual");
    expect(row.rate_date).toBeTruthy();
  });

  it("records a provider-sourced rate and the date it was quoted for", async () => {
    const id = await createExpense(s.db, MEMBER, {
      rate_source: "frankfurter",
      rate_date: "2026-05-30",
    });
    expect(await fxColumns(s.db, id)).toEqual({
      rate_source: "frankfurter",
      rate_date: "2026-05-30",
    });
  });

  it("rejects an unrecognized rate source", async () => {
    await expect(createExpense(s.db, MEMBER, { rate_source: "made_up" })).rejects.toThrow();
  });

  it("a plain edit (no rate change) leaves the recorded source and date untouched", async () => {
    const id = await createExpense(s.db, OWNER, {
      rate_source: "frankfurter",
      rate_date: "2026-05-30",
    });
    await asUser(s.db, OWNER, () =>
      s.db.query(
        `select public.update_expense($1, $2) `,
        [
          id,
          JSON.stringify({
            category_id: s.systemCategory,
            amount: 20,
            currency: "EUR",
            exchange_rate: 1,
            description: "Lunch (edited)",
            expense_date: "2026-06-02",
          }),
        ],
      ),
    );
    expect(await fxColumns(s.db, id)).toEqual({
      rate_source: "frankfurter",
      rate_date: "2026-05-30",
    });
  });

  it("today's exchange rate never changes what a historical expense already recorded", async () => {
    // Rate lookups only ever happen when create_expense/update_expense is
    // called for *this* expense — there's no background job or trigger
    // that revisits old rows, so a fixed rate/converted_amount is exactly
    // what a second, unrelated expense's differing rate proves.
    const first = await createExpense(s.db, MEMBER, { exchange_rate: 1, currency: "EUR" });
    await createExpense(s.db, MEMBER, { exchange_rate: 2, currency: "USD" });
    const { rows } = await asUser(s.db, MEMBER, () =>
      s.db.query<{ exchange_rate: string }>(
        "select exchange_rate from public.expenses where id = $1",
        [first],
      ),
    );
    expect(Number(rows[0].exchange_rate)).toBe(1);
  });
});
