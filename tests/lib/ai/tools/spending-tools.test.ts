import { describe, expect, it } from "vitest";
import { getRecentExpenses, getSpendingByCategory, getSpendingByDateRange } from "@/lib/ai/tools/spending-tools";
import { getPlannedBudgets, getTripSummary } from "@/lib/ai/tools/trip-tools";
import { invokeTool, ToolError } from "@/lib/ai/tools/types";
import { fakeContext, fakeExpense, fakeTrip } from "./fake-sdk";

const TRIP_ID = "11111111-1111-4111-8111-111111111111";
const food = (id: string, date: string, amount: number) =>
  fakeExpense({ id, expense_date: date, converted_amount: amount, category_id: "food" });
const tours = (id: string, date: string, amount: number) =>
  fakeExpense({ id, expense_date: date, converted_amount: amount, category_id: "tours", category: { name: "Tours", icon: "x" } });

describe("spending tools — authorization", () => {
  it.each([getSpendingByCategory, getRecentExpenses])("$name refuses a trip the caller can't access", async (tool) => {
    const ctx = fakeContext({ trip: null });
    await expect(tool.run(ctx, { tripId: TRIP_ID, limit: 5 } as never)).rejects.toBeInstanceOf(ToolError);
  });
});

describe("getSpendingByCategory", () => {
  it("returns the same per-category totals the analytics code computes, highest first", async () => {
    const ctx = fakeContext({
      trip: fakeTrip(),
      expenses: [food("a", "2026-06-01", 30), tours("b", "2026-06-02", 80), food("c", "2026-06-03", 20)],
    });
    expect(await getSpendingByCategory.run(ctx, { tripId: TRIP_ID })).toEqual([
      { category: "Tours", amount: 80 },
      { category: "Food", amount: 50 },
    ]);
  });
});

describe("getSpendingByDateRange", () => {
  it("totals an inclusive date range with a per-day breakdown", async () => {
    const ctx = fakeContext({
      trip: fakeTrip(),
      expenses: [food("a", "2026-06-01", 30), food("b", "2026-06-02", 10), food("c", "2026-06-02", 5), food("d", "2026-06-04", 99)],
    });
    const result = await getSpendingByDateRange.run(ctx, { tripId: TRIP_ID, from: "2026-06-02", to: "2026-06-03" });
    expect(result).toEqual({ from: "2026-06-02", to: "2026-06-03", total: 15, byDate: [{ date: "2026-06-02", amount: 15 }] });
  });

  it("rejects a malformed model-supplied date before reading anything", async () => {
    const ctx = fakeContext({ trip: fakeTrip() });
    const args = JSON.stringify({ tripId: TRIP_ID, from: "last week", to: "2026-06-03" });
    await expect(invokeTool(getSpendingByDateRange, ctx, args)).rejects.toThrow("from must be YYYY-MM-DD");
    expect(ctx.spies.get).not.toHaveBeenCalled();
  });
});

describe("getRecentExpenses", () => {
  it("honours the limit and never exposes notes or location", async () => {
    const expenses = [1, 2, 3].map((n) => fakeExpense({ id: `e${n}`, notes: "card ****1234", location: "12 Home St" }));
    const ctx = fakeContext({ trip: fakeTrip(), expenses });
    const result = await getRecentExpenses.run(ctx, { tripId: TRIP_ID, limit: 2 });
    expect(result).toHaveLength(2);
    expect(JSON.stringify(result)).not.toMatch(/1234|Home St/);
  });

  it("caps the limit at 20 even if the model asks for more", async () => {
    const args = JSON.stringify({ tripId: TRIP_ID, limit: 500 });
    await expect(invokeTool(getRecentExpenses, fakeContext({ trip: fakeTrip() }), args)).rejects.toBeInstanceOf(ToolError);
  });
});

describe("getTripSummary / getPlannedBudgets", () => {
  it("summarizes the trip with traveler count from its companions", async () => {
    const companions = [1, 2, 3].map((n) => ({ userId: `u${n}`, username: `u${n}`, firstName: "A", surname: "B" }));
    const ctx = fakeContext({ trip: fakeTrip(), expenses: [food("a", "2026-06-01", 30)], companions });
    expect(await getTripSummary.run(ctx, { tripId: TRIP_ID })).toMatchObject({
      name: "Italy",
      totalBudget: 1000,
      totalSpent: 30,
      travelerCount: 3,
      expenseCount: 1,
    });
  });

  it("pairs each category's plan with its actual spend", async () => {
    const ctx = fakeContext({
      trip: fakeTrip(),
      categories: [{ id: "food", name: "Food", icon: "x" }],
      plannedBudgets: [{ category_id: "food", planned_amount: 300 }],
      expenses: [food("a", "2026-06-01", 120)],
    });
    expect(await getPlannedBudgets.run(ctx, { tripId: TRIP_ID })).toEqual([
      { categoryId: "food", name: "Food", icon: "x", planned: 300, actual: 120 },
    ]);
  });
});
