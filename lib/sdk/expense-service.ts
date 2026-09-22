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

  /**
   * Creates the expense and its split atomically (create_expense, 0014) —
   * every expense needs a balanced expense_splits row, and the client can't
   * otherwise run both inserts in one transaction. Until the splitting UI
   * (Stage 9) can name real participants, the whole amount is a single
   * 100%-share row for the payer — exactly today's un-split behavior.
   *
   * `requestId` identifies one "create" intent; create_expense returns the
   * same id for a repeated one (a double tap, or the automatic Server Action
   * retry after a dropped connection) instead of creating a second expense.
   */
  async create(
    scope: ExpenseScope,
    input: ExpenseInput,
    requestId?: string,
  ): Promise<WriteResult> {
    const { error } = await this.db.rpc("create_expense", {
      p_trip_id: scope.tripId,
      p_expense: { ...toExpenseRow(input, scope.baseCurrency), paid_by: scope.userId, split_method: "equal" },
      p_splits: [{ user_id: scope.userId, share_amount: input.amount, share_percent: null }],
      p_request_id: requestId ?? null,
    });
    if (error) return this.fail("create", error);
    this.invalidate();
    return {};
  }

  /**
   * Who may change an expense is decided by RLS (0009 + 0014: its author,
   * its payer, or the trip owner). update_expense (0014) re-asserts the
   * single-payer split alongside the amount, so an edited amount can't leave
   * a stale share behind — a real split (Stage 9) will pass the actual
   * shares here instead. A blocked update raises 42501 (0014), which maps
   * to the same permission_denied code a refused row match used to.
   */
  async update(
    scope: ExpenseScope,
    expenseId: string,
    input: ExpenseInput,
  ): Promise<WriteResult> {
    const { error } = await this.db.rpc("update_expense", {
      p_expense_id: expenseId,
      p_expense: toExpenseRow(input, scope.baseCurrency),
      p_splits: [{ user_id: scope.userId, share_amount: input.amount, share_percent: null }],
    });
    if (error) return this.fail("update", error);
    this.invalidate();
    return {};
  }

  async delete(tripId: string, expenseId: string): Promise<WriteResult> {
    const { data, error } = await this.db
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("trip_id", tripId)
      .select("id");
    if (error) return this.fail("delete", error);
    if (!data?.length) return this.refused("delete");
    this.invalidate();
    return {};
  }

  private refused(operation: string): WriteResult {
    return this.fail(
      operation,
      { message: "no row matched: not permitted or not found" },
      "permission_denied",
    );
  }
}
