import { describe, expect, it } from "vitest";
import { applySettlements, calculateBalances, type ExpenseForBalance } from "@/lib/finance/balances";

describe("calculateBalances", () => {
  it("Alex pays €150 for dinner, split equally three ways", () => {
    const expenses: ExpenseForBalance[] = [
      {
        paidBy: "alex",
        currency: "EUR",
        convertedAmount: 150,
        splits: [
          { userId: "moa", shareAmount: 50 },
          { userId: "alex", shareAmount: 50 },
          { userId: "john", shareAmount: 50 },
        ],
      },
    ];
    const balances = calculateBalances("EUR", expenses);
    const byId = Object.fromEntries(balances.map((b) => [b.userId, b]));
    expect(byId.alex).toEqual({ userId: "alex", totalPaid: 150, totalShare: 50, netBalance: 100 });
    expect(byId.moa).toEqual({ userId: "moa", totalPaid: 0, totalShare: 50, netBalance: -50 });
    expect(byId.john).toEqual({ userId: "john", totalPaid: 0, totalShare: 50, netBalance: -50 });
  });

  it("always sums to exactly zero, even across many uneven expenses", () => {
    const expenses: ExpenseForBalance[] = [
      {
        paidBy: "a",
        currency: "EUR",
        convertedAmount: 100,
        splits: [
          { userId: "a", shareAmount: 33.34 },
          { userId: "b", shareAmount: 33.33 },
          { userId: "c", shareAmount: 33.33 },
        ],
      },
      {
        paidBy: "b",
        currency: "USD",
        convertedAmount: 47.28, // converted from a USD expense at some rate
        splits: [
          { userId: "a", shareAmount: 17 },
          { userId: "b", shareAmount: 17 },
          { userId: "c", shareAmount: 17 }, // 51 total in USD
        ],
      },
      {
        paidBy: "c",
        currency: "EUR",
        convertedAmount: 9.99,
        splits: [{ userId: "a", shareAmount: 9.99 }],
      },
    ];
    const balances = calculateBalances("EUR", expenses);
    const totalMinor = balances.reduce((sum, b) => sum + Math.round(b.netBalance * 100), 0);
    expect(totalMinor).toBe(0);
  });

  it("proportionally converts a share into base currency without losing a cent", () => {
    // A $51 expense (shared 17/17/17) converts to €47.28 — each share is a
    // third of the converted total, not a third of the original USD amount.
    const expenses: ExpenseForBalance[] = [
      {
        paidBy: "a",
        currency: "USD",
        convertedAmount: 47.28,
        splits: [
          { userId: "a", shareAmount: 17 },
          { userId: "b", shareAmount: 17 },
          { userId: "c", shareAmount: 17 },
        ],
      },
    ];
    const balances = calculateBalances("EUR", expenses);
    const shareSum = balances.reduce((sum, b) => sum + Math.round(b.totalShare * 100), 0);
    expect(shareSum).toBe(4728);
  });
});

describe("applySettlements", () => {
  it("moves a debtor's balance toward zero and reduces the creditor's credit", () => {
    const balances = calculateBalances("EUR", [
      {
        paidBy: "alex",
        currency: "EUR",
        convertedAmount: 150,
        splits: [
          { userId: "moa", shareAmount: 50 },
          { userId: "alex", shareAmount: 50 },
          { userId: "john", shareAmount: 50 },
        ],
      },
    ]);
    const settled = applySettlements("EUR", balances, [{ fromUserId: "moa", toUserId: "alex", amount: 50 }]);
    const byId = Object.fromEntries(settled.map((b) => [b.userId, b]));
    expect(byId.moa.netBalance).toBe(0);
    expect(byId.alex.netBalance).toBe(50); // john still owes 50
  });

  it("fully settling every debt zeroes every balance", () => {
    const balances = calculateBalances("EUR", [
      {
        paidBy: "alex",
        currency: "EUR",
        convertedAmount: 150,
        splits: [
          { userId: "moa", shareAmount: 50 },
          { userId: "alex", shareAmount: 50 },
          { userId: "john", shareAmount: 50 },
        ],
      },
    ]);
    const settled = applySettlements("EUR", balances, [
      { fromUserId: "moa", toUserId: "alex", amount: 50 },
      { fromUserId: "john", toUserId: "alex", amount: 50 },
    ]);
    expect(settled.every((b) => b.netBalance === 0)).toBe(true);
  });
});
