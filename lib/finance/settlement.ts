import { fromMinorUnits, toMinorUnits } from "./money";
import type { Balance } from "./balances";

export type SettlementSuggestion = { fromUserId: string; toUserId: string; amount: number };

/**
 * The minimal-transfer settle-up plan: whoever is owed the most gets paid
 * first by whoever owes the most, repeated until every balance is zero.
 * Deterministic (ties broken by userId) so the same balances always suggest
 * the same plan. Works in integer minor units — since calculateBalances
 * produces balances that sum to exactly zero, this always finishes with
 * nothing left over, never a stray fractional cent.
 */
export function suggestSettlements(
  baseCurrency: string,
  balances: Pick<Balance, "userId" | "netBalance">[],
): SettlementSuggestion[] {
  const minor = balances
    .map((b) => ({ userId: b.userId, amount: toMinorUnits(b.netBalance, baseCurrency) }))
    .filter((b) => b.amount !== 0n);

  const byAmountThenId = (a: { amount: bigint }, b: { amount: bigint }, ids: [string, string]) =>
    b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : ids[0] < ids[1] ? -1 : 1;

  const creditors = minor
    .filter((b) => b.amount > 0n)
    .sort((a, b) => byAmountThenId(a, b, [a.userId, b.userId]))
    .map((b) => ({ ...b }));
  const debtors = minor
    .filter((b) => b.amount < 0n)
    .map((b) => ({ userId: b.userId, amount: -b.amount }))
    .sort((a, b) => byAmountThenId(a, b, [a.userId, b.userId]))
    .map((b) => ({ ...b }));

  const result: SettlementSuggestion[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const transfer = credit.amount < debt.amount ? credit.amount : debt.amount;
    if (transfer > 0n) {
      result.push({
        fromUserId: debt.userId,
        toUserId: credit.userId,
        amount: fromMinorUnits(transfer, baseCurrency),
      });
    }
    credit.amount -= transfer;
    debt.amount -= transfer;
    if (credit.amount === 0n) ci++;
    if (debt.amount === 0n) di++;
  }
  return result;
}
