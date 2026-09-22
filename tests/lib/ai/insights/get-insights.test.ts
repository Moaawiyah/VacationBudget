import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInsightCache, getTripInsights } from "@/lib/ai/insights/get-insights";
import type { AIProvider } from "@/lib/ai/provider";
import { fakeContext, fakeExpense, fakeTrip } from "../tools/fake-sdk";

const TRIP_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date(2026, 5, 6, 12); // day 6 of fakeTrip's 2026-06-01..10

function overBudgetContext() {
  const expenses = [1, 2, 3, 4, 5].map((d) =>
    fakeExpense({ id: `e${d}`, expense_date: `2026-06-0${d}`, converted_amount: 140, category_id: "food" }),
  );
  return fakeContext({ trip: fakeTrip(), expenses });
}

function provider(text: string): AIProvider {
  return {
    chat: vi.fn(async () => ({ content: JSON.stringify({ insights: [{ id: 0, text }] }), toolCalls: [] })),
  };
}

beforeEach(() => clearInsightCache());

describe("getTripInsights", () => {
  it("returns nothing, touching nothing, when AI isn't configured", async () => {
    const ctx = overBudgetContext();
    expect(await getTripInsights(ctx, null, TRIP_ID, "en", NOW)).toEqual([]);
    expect(ctx.spies.get).not.toHaveBeenCalled();
  });

  it("refuses a trip the viewer can't access", async () => {
    const ctx = fakeContext({ trip: null });
    await expect(getTripInsights(ctx, provider("x"), TRIP_ID, "en", NOW)).rejects.toThrow("isn't accessible");
  });

  it("skips the model entirely when there's no meaningful signal", async () => {
    const p = provider("x");
    const ctx = fakeContext({ trip: fakeTrip(), expenses: [] });
    expect(await getTripInsights(ctx, p, TRIP_ID, "en", new Date(2026, 4, 1))).toEqual([]);
    expect(p.chat).not.toHaveBeenCalled();
  });

  it("explains detected signals, and reuses the explanation while the facts are unchanged", async () => {
    const p = provider("You're on course to finish €400 over budget.");
    const first = await getTripInsights(overBudgetContext(), p, TRIP_ID, "en", NOW);
    const second = await getTripInsights(overBudgetContext(), p, TRIP_ID, "en", NOW);
    expect(first).toEqual([{ signal: "TRIP_PROJECTED_OVER_BUDGET", text: "You're on course to finish €400 over budget." }]);
    expect(second).toEqual(first);
    expect(p.chat).toHaveBeenCalledTimes(1);
  });
});
