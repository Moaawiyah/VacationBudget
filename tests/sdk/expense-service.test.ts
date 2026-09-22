import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpenseService, toExpenseRow } from "@/lib/sdk/expense-service";
import { callsOf, createFakeDb, muteErrorLog } from "../helpers/fake-db";
import { expenseInput, expenseRow } from "../helpers/fixtures";

afterEach(() => vi.restoreAllMocks());

const scope = { userId: "user-1", tripId: "trip-1", baseCurrency: "EUR" };

describe("toExpenseRow", () => {
  it("always uses rate 1 for the trip's own currency, ignoring a sent rate", () => {
    const row = toExpenseRow({ ...expenseInput, exchange_rate: 3 }, "EUR");
    expect(row).toMatchObject({ exchange_rate: 1, converted_amount: 20 });
    expect(row).toMatchObject({ merchant: null, location: null, notes: null });
  });

  it("converts a foreign-currency amount with the entered rate", () => {
    const row = toExpenseRow(
      {
        ...expenseInput,
        currency: "USD",
        amount: 10,
        exchange_rate: 0.915,
        merchant: "Deli",
      },
      "EUR",
    );
    expect(row).toMatchObject({
      exchange_rate: 0.915,
      converted_amount: 9.15,
      merchant: "Deli",
    });
  });
});

describe("ExpenseService reads", () => {
  it("lists a trip's expenses newest first, with categories, cached per trip", async () => {
    const { db, from, calls } = createFakeDb({
      expenses: [
        {
          data: [
            { ...expenseRow(), categories: { name: "Food", icon: "utensils" } },
            { ...expenseRow({ id: "exp-2" }), categories: null },
          ],
        },
      ],
    });
    const expenses = new ExpenseService(db);

    const list = await expenses.listForTrip("trip-1");
    await expenses.listForTrip("trip-1");

    expect(list.map((e) => [e.id, e.amount, e.category.name])).toEqual([
      ["exp-1", 20, "Food"],
      ["exp-2", 20, "Other"],
    ]);
    expect(from).toHaveBeenCalledTimes(1);
    expect(callsOf(calls, "expenses", "order")[0]).toEqual([
      "expense_date",
      { ascending: false },
    ]);
  });

  it("returns [] when the query yields nothing", async () => {
    const { db } = createFakeDb();
    expect(await new ExpenseService(db).listForTrip("trip-1")).toEqual([]);
  });

  it("gets one expense scoped to its trip, or null", async () => {
    const { db, calls } = createFakeDb({ expenses: [{ data: expenseRow() }, {}] });
    const expenses = new ExpenseService(db);
    expect((await expenses.get("trip-1", "exp-1"))?.converted_amount).toBe(20);
    expect(await expenses.get("trip-2", "exp-1")).toBeNull();
    expect(callsOf(calls, "expenses", "eq")).toContainEqual(["trip_id", "trip-2"]);
  });
});

describe("ExpenseService writes", () => {
  it("creates an expense (and its single-payer split) via create_expense", async () => {
    const { db, rpcCalls } = createFakeDb({}, { create_expense: [{ data: "exp-1" }] });
    expect(await new ExpenseService(db).create(scope, expenseInput)).toEqual({});
    expect(rpcCalls[0].fn).toBe("create_expense");
    const args = rpcCalls[0].args as Record<string, unknown>;
    expect(args.p_trip_id).toBe("trip-1");
    expect(args.p_expense).toMatchObject({ paid_by: "user-1", split_method: "equal" });
    expect(args.p_splits).toEqual([{ user_id: "user-1", share_amount: 20, share_percent: null }]);
  });

  it("updates via update_expense, and scopes delete by expense and trip", async () => {
    const hit = { data: [{ id: "exp-1" }] };
    const { db, calls, rpcCalls } = createFakeDb(
      { expenses: [hit] },
      { update_expense: [{ data: null }] },
    );
    const expenses = new ExpenseService(db);
    expect(await expenses.update(scope, "exp-1", expenseInput)).toEqual({});
    expect(await expenses.delete("trip-1", "exp-1")).toEqual({});
    expect(rpcCalls[0]).toMatchObject({ fn: "update_expense" });
    expect(callsOf(calls, "expenses", "eq")).toEqual([
      ["id", "exp-1"],
      ["trip_id", "trip-1"],
    ]);
  });

  it("reports a delete that RLS refused (zero rows) as permission denied", async () => {
    muteErrorLog();
    const { db } = createFakeDb({ expenses: [{ data: [] }] });
    const expenses = new ExpenseService(db);
    expect(await expenses.delete("trip-1", "exp-1")).toEqual({
      error: expect.any(String),
      code: "permission_denied",
    });
  });

  it("reports an update RLS blocked (update_expense raises 42501) as permission denied", async () => {
    muteErrorLog();
    const blocked = { error: { message: "expense not found or not permitted", code: "42501" } };
    const { db } = createFakeDb({}, { update_expense: [blocked] });
    expect(await new ExpenseService(db).update(scope, "exp-1", expenseInput)).toEqual({
      error: expect.any(String),
      code: "permission_denied",
    });
  });

  it("returns a safe code, never the raw database message, and logs the raw one", async () => {
    const log = muteErrorLog();
    const failure = { error: { message: 'new row violates policy "x"', code: "42501" } };
    const { db } = createFakeDb(
      { expenses: [failure] },
      { create_expense: [failure], update_expense: [failure] },
    );
    const expenses = new ExpenseService(db);

    for (const result of [
      await expenses.create(scope, expenseInput),
      await expenses.update(scope, "exp-1", expenseInput),
      await expenses.delete("trip-1", "exp-1"),
    ]) {
      expect(result.code).toBe("permission_denied");
      expect(result.error).not.toContain("policy");
    }
    expect(log).toHaveBeenCalledTimes(3);
    expect(log.mock.calls[0]?.[0]).toContain("violates policy");
  });

  it("sends the request id through to create_expense, which dedupes replays itself", async () => {
    const { db, rpcCalls } = createFakeDb({}, { create_expense: [{ data: "exp-1" }] });
    const result = await new ExpenseService(db).create(scope, expenseInput, "req-1");
    expect(result).toEqual({});
    expect((rpcCalls[0].args as Record<string, unknown>).p_request_id).toBe("req-1");
  });
});
