import { convertCurrency } from "@/lib/currency/convert";
import type { ExpenseInput } from "@/lib/validation/expense";
import {
  toExpense,
  toExpenseWithCategory,
  type Expense,
  type ExpenseWithCategory,
} from "@/types/expense";
import { BaseService } from "./base-service";
import type { DbClient, WriteResult } from "./types";

/**
 * Column values for an expense row, from validated input. Same-currency
 * expenses always convert at 1 (a client-sent rate is ignored), and
 * converted_amount is always derived here, never trusted from the client.
 * createExpenseSchema guarantees exchange_rate whenever the currencies differ.
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
  };
}

/** Where an expense belongs: its owner, its trip and that trip's base currency. */
export type ExpenseScope = { userId: string; tripId: string; baseCurrency: string };

export class ExpenseService extends BaseService {
  constructor(db: DbClient) {
    super(db, "expenses");
  }

  /** A trip's expenses with their category, newest first. */
  listForTrip(tripId: string): Promise<ExpenseWithCategory[]> {
    return this.memo(`trip:${tripId}`, async () => {
      const { data } = await this.db
        .from("expenses")
        .select("*, categories(name, icon)")
        .eq("trip_id", tripId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []).map(toExpenseWithCategory);
    });
  }

  /**
   * One expense, scoped to its trip too: an expenseId from another trip
   * (stale link, edited URL) returns null instead of being edited against
   * the wrong trip's base currency.
   */
  async get(tripId: string, expenseId: string): Promise<Expense | null> {
    const { data } = await this.db
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .eq("trip_id", tripId)
      .single();
    return data ? toExpense(data) : null;
  }

  async create(scope: ExpenseScope, input: ExpenseInput): Promise<WriteResult> {
    const { error } = await this.db.from("expenses").insert({
      trip_id: scope.tripId,
      user_id: scope.userId,
      ...toExpenseRow(input, scope.baseCurrency),
    });
    if (error) return this.fail("create", error);
    this.invalidate();
    return {};
  }

  async update(
    scope: ExpenseScope,
    expenseId: string,
    input: ExpenseInput,
  ): Promise<WriteResult> {
    const { error } = await this.db
      .from("expenses")
      .update(toExpenseRow(input, scope.baseCurrency))
      // Scoped by trip_id too, so a URL pairing this trip with another of the
      // user's expenses can't reprice that expense in this trip's currency.
      .eq("id", expenseId)
      .eq("trip_id", scope.tripId);
    if (error) return this.fail("update", error);
    this.invalidate();
    return {};
  }

  async delete(_userId: string, tripId: string, expenseId: string): Promise<WriteResult> {
    const { error } = await this.db
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("trip_id", tripId);
    if (error) return this.fail("delete", error);
    this.invalidate();
    return {};
  }
}
