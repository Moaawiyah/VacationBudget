import { describe, expect, it } from "vitest";
import { suggestSettlements } from "@/lib/finance/settlement";
import { applySettlements, calculateBalances } from "@/lib/finance/balances";

describe("suggestSettlements", () => {
  it("Moa is owed €150 total; Alex and John each pay their share directly to Moa", () => {
    const balances = [
      { userId: "moa", netBalance: 150 },
      { userId: "alex", netBalance: -100 },
      { userId: "john", netBalance: -50 },
    ];
    const suggestions = suggestSettlements("EUR", balances);
    expect(suggestions).toEqual([
      { fromUserId: "alex", toUserId: "moa", amount: 100 },
      { fromUserId: "john", toUserId: "moa", amount: 50 },
    ]);
  });

  it("skips anyone already at zero", () => {
    const balances = [
      { userId: "a", netBalance: 20 },
      { userId: "b", netBalance: 0 },
      { userId: "c", netBalance: -20 },
    ];
    expect(suggestSettlements("EUR", balances)).toEqual([
      { fromUserId: "c", toUserId: "a", amount: 20 },
    ]);
  });

  it("returns nothing when everyone is already square", () => {
    const balances = [
      { userId: "a", netBalance: 0 },
      { userId: "b", netBalance: 0 },
    ];
    expect(suggestSettlements("EUR", balances)).toEqual([]);
  });

  it("is deterministic for tied amounts, ordering by userId", () => {
    const balances = [
      { userId: "b", netBalance: 10 },
      { userId: "a", netBalance: 10 },
      { userId: "d", netBalance: -10 },
      { userId: "c", netBalance: -10 },
    ];
    const result = suggestSettlements("EUR", balances);
    expect(result).toEqual([
      { fromUserId: "c", toUserId: "a", amount: 10 },
      { fromUserId: "d", toUserId: "b", amount: 10 },
    ]);
  });

  it("splits a debt across two creditors without leaving a fractional cent behind", () => {
    // €0.03 owed, split across two creditors of €0.02 and €0.01 — makes sure
    // the greedy match doesn't round anything away.
    const balances = [
      { userId: "a", netBalance: 0.02 },
      { userId: "b", netBalance: 0.01 },
      { userId: "c", netBalance: -0.03 },
    ];
    const result = suggestSettlements("EUR", balances);
    const total = result.reduce((sum, s) => sum + Math.round(s.amount * 100), 0);
    expect(total).toBe(3);
  });

  it("suggests nothing left to settle once every recorded transfer is applied", () => {
    const balances = calculateBalances("EUR", [
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
    ]);
    const suggestions = suggestSettlements("EUR", balances);
    const settled = applySettlements(
      "EUR",
      balances,
      suggestions.map((s) => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount })),
    );
    expect(settled.every((b) => b.netBalance === 0)).toBe(true);
  });
});
