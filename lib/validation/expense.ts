import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency/constants";

export const expenseFields = z.object({
  amount: z.coerce.number().positive("Enter an amount"),
  currency: z.enum(CURRENCY_CODES, { message: "Choose a currency" }),
  // Only required when currency differs from the trip's base currency —
  // see createExpenseSchema below, which knows that at call time.
  exchange_rate: z.coerce.number().positive("Enter a valid rate").optional(),
  category_id: z.string().uuid("Choose a category"),
  description: z.string().trim().min(1, "Description is required").max(200),
  expense_date: z.string().min(1, "Date is required"),
  merchant: z.string().trim().max(200).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseFields>;

/**
 * A rate is only required when the expense's currency isn't the trip's own
 * — same-currency expenses always convert at 1, so nothing to enter. Built
 * as a factory (not a static schema) because that rule depends on the
 * trip's base currency, which isn't known until the form/action has one.
 */
export function createExpenseSchema(baseCurrency: string) {
  return expenseFields.refine(
    (data) => data.currency === baseCurrency || (data.exchange_rate ?? 0) > 0,
    { message: "Enter an exchange rate", path: ["exchange_rate"] },
  );
}

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
});

export type CategoryInput = z.infer<typeof categorySchema>;
