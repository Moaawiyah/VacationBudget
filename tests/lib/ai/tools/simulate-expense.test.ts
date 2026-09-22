import { afterEach, describe, expect, it, vi } from "vitest";
import { simulateExpense } from "@/lib/ai/tools/simulate-expense";
import { ToolError } from "@/lib/ai/tools/types";
import { fakeContext, fakeExpense, fakeTrip } from "./fake-sdk";

afterEach(() => vi.unstubAllGlobals());

describe("simulateExpense — authorization and safety", () => {
  it("refuses a trip the caller can't access", async () => {
    const ctx = fakeContext({ trip: null });
    await expect(
      simulateExpense.run(ctx, { tripId: "trip-1", amount: 50 }),
    ).rejects.toBeInstanceOf(ToolError);
  });

  it("never calls anything that writes — only listForTrip is read", async () => {
    const ctx = fakeContext({
      trip: fakeTrip({ total_budget: 1000 }),
      expenses: [fakeExpense({ converted_amount: 200 })],
    });
    await simulateExpense.run(ctx, { tripId: "trip-1", amount: 50 });
    // The fake SDK only exposes read methods at all — this simply confirms
    // the tool called the one it's supposed to, and nothing unexpected.
    expect(ctx.sdk.expenses.listForTrip).toHaveBeenCalledWith("trip-1");
  });
});

describe("simulateExpense — same-currency (no FX lookup needed)", () => {
  it("adds the amount straight to spent and recomputes the forecast", async () => {
    const ctx = fakeContext({
      trip: fakeTrip({
        start_date: "2026-01-01",
        end_date: "2026-01-12",
        base_currency: "EUR",
        total_budget: 3000,
      }),
      expenses: [fakeExpense({ converted_amount: 1840 })],
    });
    const result = await simulateExpense.run(ctx, {
      tripId: "trip-1",
      amount: 200,
      currency: "EUR",
    });
    expect(result.convertedAmount).toBe(200);
    expect(result.currentRemaining).toBe(1160);
    expect(result.newRemaining).toBe(960);
    expect(result.wouldExceedBudgetToday).toBe(false);
  });

  it("flags wouldExceedBudgetToday once the simulated total actually passes the budget", async () => {
    const ctx = fakeContext({
      trip: fakeTrip({ total_budget: 1000 }),
      expenses: [fakeExpense({ converted_amount: 900 })],
    });
    const result = await simulateExpense.run(ctx, { tripId: "trip-1", amount: 200 });
    expect(result.wouldExceedBudgetToday).toBe(true);
  });
});

describe("simulateExpense — cross-currency", () => {
  it("converts using a live rate lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ date: "2026-06-01", rates: { EUR: 0.9 } }),
      }),
    );
    const ctx = fakeContext({ trip: fakeTrip({ total_budget: 1000 }), expenses: [] });
    const result = await simulateExpense.run(ctx, {
      tripId: "trip-1",
      amount: 100,
      currency: "USD",
    });
    expect(result.convertedAmount).toBe(90);
  });

  it("fails clearly (not a silent 1:1 guess) when no rate can be found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const ctx = fakeContext({ trip: fakeTrip({ total_budget: 1000 }), expenses: [] });
    await expect(
      simulateExpense.run(ctx, { tripId: "trip-1", amount: 100, currency: "USD" }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
