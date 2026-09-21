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
  it("creates an expense owned by the session user in the scoped trip", async () => {
    const { db, calls } = createFakeDb();
    expect(await new ExpenseService(db).create(scope, expenseInput)).toEqual({});
    const [row] = callsOf(calls, "expenses", "insert")[0] as [Record<string, unknown>];
    expect(row).toMatchObject({
      trip_id: "trip-1",
      user_id: "user-1",
      converted_amount: 20,
    });
  });

  it("scopes collaborative update and delete by expense and trip", async () => {
    const { db, calls } = createFakeDb();
    const expenses = new ExpenseService(db);
    expect(await expenses.update(scope, "exp-1", expenseInput)).toEqual({});
    expect(await expenses.delete("user-1", "trip-1", "exp-1")).toEqual({});
    const scoped = [
      ["id", "exp-1"],
      ["trip_id", "trip-1"],
    ];
    expect(callsOf(calls, "expenses", "eq")).toEqual([...scoped, ...scoped]);
  });

  it("returns and logs database errors from every write", async () => {
    const log = muteErrorLog();
    const failure = { error: { message: "denied" } };
    const { db } = createFakeDb({ expenses: [failure, failure, failure] });
    const expenses = new ExpenseService(db);

    expect(await expenses.create(scope, expenseInput)).toEqual({ error: "denied" });
    expect(await expenses.update(scope, "exp-1", expenseInput)).toEqual({
      error: "denied",
    });
    expect(await expenses.delete("user-1", "trip-1", "exp-1")).toEqual({
      error: "denied",
    });
    expect(log).toHaveBeenCalledTimes(3);
  });
});
