import { convertCurrency } from "@/lib/currency/convert";
import type { ExpenseInput } from "@/lib/validation/expense";

/**
 * Column values for an expense row, from validated input. Same-currency
 * expenses always convert at 1 (a client-sent rate is ignored), and
 * converted_amount is always derived here, never trusted from the client.
 * createExpenseSchema guarantees exchange_rate whenever the currencies differ.
 *
 * rate_source/rate_date default to "manual"/today when the form never set
 * them (same-currency expenses, or a rate typed with no live lookup) — see
 * lib/currency/exchange-rate.ts and 0016_historical_fx.sql.
 */
export function toExpenseRow(input: ExpenseInput, baseCurrency: string) {
  const exchangeRate = input.currency === baseCurrency ? 1 : input.exchange_rate!;
  return {
    category_id: input.category_id,
    amount: input.amount,
    currency: input.currency,
    exchange_rate: exchangeRate,
    converted_amount: convertCurrency(input.amount, exchangeRate),
    description: input.description,
    expense_date: input.expense_date,
    merchant: input.merchant || null,
    location: input.location || null,
    notes: input.notes || null,
    rate_source: input.rate_source ?? "manual",
    rate_date: input.rate_date ?? new Date().toISOString().slice(0, 10),
  };
}

/**
 * The expense_splits rows to write: the form's own split when it built one
 * (SplitFields, via calculateSplit — already reconciled to the amount), or
 * a single 100%-share row for `fallbackPayer` otherwise.
 */
export function toSplitsPayload(input: ExpenseInput, fallbackPayer: string) {
  if (input.splits?.length) {
    return input.splits.map((s) => ({
      user_id: s.user_id,
      share_amount: s.share_amount,
      share_percent: s.share_percent ?? null,
    }));
  }
  return [{ user_id: fallbackPayer, share_amount: input.amount, share_percent: null }];
}
