import type { ExpenseInput } from "@/lib/validation/expense";
import type { ExpenseForBalance } from "@/lib/finance/balances";
import {
  toExpense,
  toExpenseWithCategory,
  type Expense,
  type ExpenseWithCategory,
} from "@/types/expense";
import { BaseService } from "./base-service";
import { toExpenseRow, toSplitsPayload } from "./expense-payload";
import type { DbClient, WriteResult } from "./types";

export { toExpenseRow } from "./expense-payload";

/** One participant's share of an expense, in the expense's own currency. */
export type ExpenseSplit = { userId: string; shareAmount: number; sharePercent: number | null };

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
   * Every expense's payer, currency and converted amount, with its splits
   * (each participant's share, in the expense's own currency) — exactly the
   * shape lib/finance/balances.ts's calculateBalances expects. Nothing here
   * does the arithmetic; this only reads the rows.
   */
  listWithSplitsForTrip(tripId: string): Promise<ExpenseForBalance[]> {
    return this.memo(`trip:${tripId}:splits`, async () => {
      const { data } = await this.db
        .from("expenses")
        .select("paid_by, currency, converted_amount, expense_splits(user_id, share_amount)")
        .eq("trip_id", tripId);
      return (data ?? []).map((row) => ({
        paidBy: row.paid_by,
        currency: row.currency,
        convertedAmount: Number(row.converted_amount),
        splits: (row.expense_splits ?? []).map((s) => ({
          userId: s.user_id,
          shareAmount: Number(s.share_amount),
        })),
      }));
    });
  }

  /**
   * One expense, scoped to its trip too: an expenseId from another trip
   * (stale link, edited URL) returns null instead of being edited against
   * the wrong trip's base currency.
   */
  /**
   * One expense's split rows (who owes what share), for the edit form to
   * start from. RLS (0014's expense_splits_select_visible) limits them to
   * the expense's trip participants, same as the expense itself.
   */
  async getSplits(expenseId: string): Promise<ExpenseSplit[]> {
    const { data } = await this.db
      .from("expense_splits")
      .select("user_id, share_amount, share_percent")
      .eq("expense_id", expenseId)
      .order("created_at");
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      shareAmount: Number(row.share_amount),
      sharePercent: row.share_percent === null ? null : Number(row.share_percent),
    }));
  }

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
   * otherwise run both inserts in one transaction. Without a split from the
   * form (`input.splits`), the whole amount is a single 100%-share row for
   * the payer — the un-split behavior, and the default when splitting isn't
   * turned on.
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
      p_expense: {
        ...toExpenseRow(input, scope.baseCurrency),
        paid_by: input.paid_by ?? scope.userId,
        split_method: input.split_method ?? "equal",
      },
      p_splits: toSplitsPayload(input, scope.userId),
      p_request_id: requestId ?? null,
    });
    if (error) return this.fail("create", error);
    this.invalidate();
    return {};
  }

  /**
   * Who may change an expense is decided by RLS (0009 + 0014: its author,
   * its payer, or the trip owner) — so an owner fixing a member's typo must
   * not, as a side effect, reassign the expense's payer to themselves. When
   * the form didn't touch the split (`input.splits` unset), the fallback
   * share goes to the expense's *existing* payer, read back first, not to
   * whoever happens to be editing it. update_expense (0014) re-asserts that
   * share alongside the amount, so an edited amount can't leave a stale
   * share behind. A blocked update raises 42501 (0014), which maps to the
   * same permission_denied code a refused row match used to.
   *
   * Editing an expense that already has a real multi-person split, without
   * reopening the split UI, collapses it back to that single share — the
   * edit form doesn't yet reload an existing split to edit in place.
   */
  async update(
    scope: ExpenseScope,
    expenseId: string,
    input: ExpenseInput,
  ): Promise<WriteResult> {
    const { data: current } = await this.db
      .from("expenses")
      .select("paid_by")
      .eq("id", expenseId)
      .single();
    const payer = input.paid_by ?? current?.paid_by ?? scope.userId;
    const { error } = await this.db.rpc("update_expense", {
      p_expense_id: expenseId,
      p_expense: {
        ...toExpenseRow(input, scope.baseCurrency),
        paid_by: payer,
        split_method: input.split_method ?? "equal",
      },
      p_splits: toSplitsPayload(input, payer),
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
