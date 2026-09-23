import type { SplitMethod } from "@/lib/finance/split";
import type { ExpenseSplit } from "@/lib/sdk/expense-service";
import type { SplitFieldsState } from "./use-split-fields";

/**
 * The split UI's starting state for an existing expense, rebuilt from what
 * was actually saved: its payer, its method, and each participant's share.
 * Without this the edit form would start from "you paid, no split" — and
 * saving any unrelated change (a typo in the description) would silently
 * replace the real split with that. A single 100% share held by the payer
 * is an unsplit expense, so the toggle starts off but the payer is kept.
 */
export function splitStateFromExpense(
  expense: { paid_by: string; split_method: SplitMethod },
  splits: ExpenseSplit[],
): SplitFieldsState {
  const unsplit = splits.length === 0 || (splits.length === 1 && splits[0].userId === expense.paid_by);
  if (unsplit) {
    return {
      enabled: false,
      paidBy: expense.paid_by,
      method: "equal",
      participantIds: [expense.paid_by],
      exactAmounts: {},
      percentages: {},
    };
  }
  return {
    enabled: true,
    paidBy: expense.paid_by,
    method: expense.split_method,
    participantIds: splits.map((s) => s.userId),
    exactAmounts: Object.fromEntries(splits.map((s) => [s.userId, s.shareAmount])),
    percentages: Object.fromEntries(
      splits.filter((s) => s.sharePercent !== null).map((s) => [s.userId, s.sharePercent as number]),
    ),
  };
}
