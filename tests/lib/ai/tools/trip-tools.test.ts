import { describe, expect, it } from "vitest";
import { getBudgetStatus, getBudgetForecast, getTripSummary } from "@/lib/ai/tools/trip-tools";
import { calculateBudgetForecast } from "@/lib/finance/forecast";
import { ToolError } from "@/lib/ai/tools/types";
import { fakeContext, fakeExpense, fakeTrip } from "./fake-sdk";

describe("trip tools — authorization", () => {
  it("getTripSummary refuses a trip the caller can't access, without reading anything else", async () => {
    const ctx = fakeContext({ trip: null });
    await expect(getTripSummary.run(ctx, { tripId: "trip-1" })).rejects.toBeInstanceOf(ToolError);
    expect(ctx.spies.get).toHaveBeenCalledWith("trip-1");
  });

  it("getBudgetStatus refuses a trip the caller can't access", async () => {
    const ctx = fakeContext({ trip: null });
    await expect(getBudgetStatus.run(ctx, { tripId: "trip-1" })).rejects.toBeInstanceOf(ToolError);
  });
});

describe("getBudgetStatus", () => {
  it("computes remaining from the trip's own budget and expense totals — no reimplemented math", async () => {
    const ctx = fakeContext({
      trip: fakeTrip({ total_budget: 1000 }),
      expenses: [fakeExpense({ converted_amount: 300 }), fakeExpense({ converted_amount: 100 })],
    });
    const result = await getBudgetStatus.run(ctx, { tripId: "trip-1" });
    expect(result).toEqual({
      currency: "EUR",
      totalBudget: 1000,
      spent: 400,
      remaining: 600,
      isOverBudget: false,
    });
  });
});

describe("getBudgetForecast", () => {
  it("returns exactly what lib/finance/forecast.ts's calculateBudgetForecast computes", async () => {
    const trip = fakeTrip({ start_date: "2026-01-01", end_date: "2026-01-12", total_budget: 3000 });
    const ctx = fakeContext({ trip, expenses: [fakeExpense({ converted_amount: 1840 })] });
    const result = await getBudgetForecast.run(ctx, { tripId: "trip-1" });
    expect(result).toEqual(
      calculateBudgetForecast(trip.start_date, trip.end_date, trip.total_budget, 1840),
    );
  });
});
