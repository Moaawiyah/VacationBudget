import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency/constants";
import type { Dictionary } from "@/lib/i18n/types";

/** Kept in one place so generated notes can't exceed what this schema accepts. */
export const NOTES_MAX_LENGTH = 1000;

export function expenseFields(t: Dictionary["validation"]) {
  return z.object({
    amount: z.coerce.number().positive(t.amountPositive),
    currency: z.enum(CURRENCY_CODES, { message: t.currencyChoose }),
    // Only required when currency differs from the trip's base currency —
    // see createExpenseSchema below, which knows that at call time.
    exchange_rate: z.coerce.number().positive(t.exchangeRatePositive).optional(),
    // Provenance of exchange_rate: which provider looked it up (or "manual"
    // if the trip's own currency, or the user typed/edited it themselves),
    // and the calendar date that rate is quoted for. Both optional — a
    // same-currency expense has no rate to provenance at all.
    rate_source: z.enum(["manual", "frankfurter"]).optional(),
    rate_date: z.string().optional(),
    category_id: z.string().uuid(t.categoryChoose),
    description: z
      .string()
      .trim()
      .min(1, t.descriptionRequired)
      .max(200, t.descriptionMax200),
    expense_date: z.string().min(1, t.dateRequired),
    merchant: z.string().trim().max(200).optional().or(z.literal("")),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    notes: z.string().trim().max(NOTES_MAX_LENGTH).optional().or(z.literal("")),
    // Who actually paid, and how it's divided — both optional. Omitted,
    // ExpenseService falls back to "the author paid it all themselves",
    // today's behavior. The database (0013/0014) is the authoritative check
    // on whether `splits` actually reconciles; this only shapes the data.
    paid_by: z.string().uuid().optional(),
    split_method: z.enum(["equal", "exact", "percentage"]).optional(),
    splits: z
      .array(
        z.object({
          user_id: z.string().uuid(),
          share_amount: z.coerce.number().nonnegative(),
          share_percent: z.coerce.number().min(0).max(100).nullable().optional(),
        }),
      )
      .optional(),
  });
}

export type ExpenseInput = z.infer<ReturnType<typeof expenseFields>>;

/**
 * A rate is only required when the expense's currency isn't the trip's own
 * — same-currency expenses always convert at 1, so nothing to enter. Built
 * as a factory (not a static schema) because that rule depends on the
 * trip's base currency, which isn't known until the form/action has one —
 * and now also on the current dictionary, for the same reason.
 */
export function createExpenseSchema(baseCurrency: string, t: Dictionary["validation"]) {
  return expenseFields(t).refine(
    (data) => data.currency === baseCurrency || (data.exchange_rate ?? 0) > 0,
    { message: t.exchangeRateRequired, path: ["exchange_rate"] },
  );
}

export function categorySchema(t: Dictionary["validation"]) {
  return z.object({
    name: z.string().trim().min(1, t.categoryNameRequired).max(50),
  });
}

export type CategoryInput = z.infer<ReturnType<typeof categorySchema>>;
