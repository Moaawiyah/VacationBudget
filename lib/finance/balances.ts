import { allocateByWeight, toMinorUnits, fromMinorUnits } from "./money";

export type ExpenseForBalance = {
  paidBy: string;
  currency: string;
  /** amount converted into the trip's base currency (expenses.converted_amount). */
  convertedAmount: number;
  /** each participant's share, in the expense's own currency (sums to the expense amount). */
  splits: { userId: string; shareAmount: number }[];
};

export type SettlementForBalance = { fromUserId: string; toUserId: string; amount: number };

export type Balance = { userId: string; totalPaid: number; totalShare: number; netBalance: number };

/**
 * Who paid for what, and what each person's share of it was — purely from
 * expenses, in the trip's base currency. Positive netBalance: owed money.
 * Negative: owes money. Built from integer minor units throughout, so the
 * balances always sum to exactly zero (never an off-by-a-cent drift).
 *
 * A share is recorded in the expense's own currency (lib/finance/split.ts),
 * so it's converted to base currency here using the same proportional,
 * remainder-safe allocation the split itself used — the participants'
 * base-currency shares always add up to exactly convertedAmount.
 */
export function calculateBalances(
  baseCurrency: string,
  expenses: ExpenseForBalance[],
): Balance[] {
  const paid = new Map<string, bigint>();
  const share = new Map<string, bigint>();
  const bump = (map: Map<string, bigint>, userId: string, delta: bigint) =>
    map.set(userId, (map.get(userId) ?? 0n) + delta);

  for (const expense of expenses) {
    const convertedMinor = toMinorUnits(expense.convertedAmount, baseCurrency);
    bump(paid, expense.paidBy, convertedMinor);

    const weights = expense.splits.map((s) => toMinorUnits(s.shareAmount, expense.currency));
    const baseShares = allocateByWeight(convertedMinor, weights);
    expense.splits.forEach((s, i) => bump(share, s.userId, baseShares[i]));
  }

  const userIds = new Set([...paid.keys(), ...share.keys()]);
  return [...userIds].map((userId) => {
    const paidMinor = paid.get(userId) ?? 0n;
    const shareMinor = share.get(userId) ?? 0n;
    return {
      userId,
      totalPaid: fromMinorUnits(paidMinor, baseCurrency),
      totalShare: fromMinorUnits(shareMinor, baseCurrency),
      netBalance: fromMinorUnits(paidMinor - shareMinor, baseCurrency),
    };
  });
}

/**
 * Folds recorded settlements (already-happened real-world payments) into
 * expense-only balances. Paying down what you owe moves your balance toward
 * zero; being paid moves the payee's balance toward zero the same way.
 */
export function applySettlements(
  baseCurrency: string,
  balances: Balance[],
  settlements: SettlementForBalance[],
): Balance[] {
  const adjustment = new Map<string, bigint>();
  const bump = (userId: string, delta: bigint) =>
    adjustment.set(userId, (adjustment.get(userId) ?? 0n) + delta);

  for (const s of settlements) {
    const minor = toMinorUnits(s.amount, baseCurrency);
    bump(s.fromUserId, minor); // paid down their debt
    bump(s.toUserId, -minor); // already received, less still owed to them
  }

  return balances.map((b) => {
    const delta = adjustment.get(b.userId) ?? 0n;
    if (delta === 0n) return b;
    const netMinor = toMinorUnits(b.netBalance, baseCurrency) + delta;
    return { ...b, netBalance: fromMinorUnits(netMinor, baseCurrency) };
  });
}
