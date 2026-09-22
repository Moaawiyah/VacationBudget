import { describe, expect, it } from "vitest";
import { getTravelerBalances, getSettlementSuggestions } from "@/lib/ai/tools/balance-tools";
import { ToolError } from "@/lib/ai/tools/types";
import { fakeContext, fakeTrip } from "./fake-sdk";

const alex = { userId: "alex", username: "alex", firstName: "Alex", surname: "" };
const moa = { userId: "moa", username: "moa", firstName: "Moa", surname: "" };
const john = { userId: "john", username: "john", firstName: "John", surname: "" };

// Alex paid €150 for dinner, split equally three ways — same worked
// example as tests/lib/finance/balances.test.ts.
const dinner = {
  paidBy: "alex",
  currency: "EUR",
  convertedAmount: 150,
  splits: [
    { userId: "moa", shareAmount: 50 },
    { userId: "alex", shareAmount: 50 },
    { userId: "john", shareAmount: 50 },
  ],
};

describe("balance tools — authorization", () => {
  it("refuses a trip the caller can't access", async () => {
    const ctx = fakeContext({ trip: null });
    await expect(getTravelerBalances.run(ctx, { tripId: "trip-1" })).rejects.toBeInstanceOf(
      ToolError,
    );
    await expect(getSettlementSuggestions.run(ctx, { tripId: "trip-1" })).rejects.toBeInstanceOf(
      ToolError,
    );
  });
});

describe("getTravelerBalances", () => {
  it("matches lib/finance/balances.ts and resolves display names via companions", async () => {
    const ctx = fakeContext({
      trip: fakeTrip(),
      expensesWithSplits: [dinner],
      companions: [alex, moa, john],
    });
    const result = await getTravelerBalances.run(ctx, { tripId: "trip-1" });
    const alexBalance = result.balances.find((b) => b.userId === "alex");
    expect(alexBalance).toMatchObject({ traveler: "Alex", netBalance: 100 });
  });
});

describe("getSettlementSuggestions", () => {
  it("suggests Moa gets paid €50 each by Alex and John — the spec's own worked example", async () => {
    const ctx = fakeContext({
      trip: fakeTrip(),
      expensesWithSplits: [
        {
          paidBy: "moa",
          currency: "EUR",
          convertedAmount: 150,
          splits: [
            { userId: "moa", shareAmount: 0 },
            { userId: "alex", shareAmount: 100 },
            { userId: "john", shareAmount: 50 },
          ],
        },
      ],
      companions: [alex, moa, john],
    });
    const result = await getSettlementSuggestions.run(ctx, { tripId: "trip-1" });
    expect(result.suggestions).toEqual([
      { from: "Alex", to: "Moa", amount: 100 },
      { from: "John", to: "Moa", amount: 50 },
    ]);
  });
});
