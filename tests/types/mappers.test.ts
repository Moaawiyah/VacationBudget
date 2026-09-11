import { describe, expect, it } from "vitest";
import { toTrip } from "@/types/trip";
import { toExpense, toExpenseWithCategory } from "@/types/expense";
import { toPlannedBudget } from "@/types/planned-budget";
import { expenseRow, tripRow } from "../helpers/fixtures";

// Postgres numeric columns arrive from Supabase as strings; the mappers are
// the one place they become numbers.
describe("domain mappers", () => {
  it("parses a trip's budget", () => {
    expect(toTrip(tripRow() as never).total_budget).toBe(1500);
  });

  it("parses an expense's numeric columns", () => {
    const parsed = toExpense(
      expenseRow({ amount: "12.34", exchange_rate: "0.5" }) as never,
    );
    expect([parsed.amount, parsed.exchange_rate, parsed.converted_amount]).toEqual([
      12.34, 0.5, 20,
    ]);
  });

  it("attaches the category, or an 'Other' fallback when it's missing", () => {
    const withCategory = toExpenseWithCategory({
      ...expenseRow(),
      categories: { name: "Food", icon: "utensils" },
    } as never);
    expect(withCategory.category).toEqual({ name: "Food", icon: "utensils" });
    expect("categories" in withCategory).toBe(false);

    const orphan = toExpenseWithCategory({ ...expenseRow(), categories: null } as never);
    expect(orphan.category).toEqual({ name: "Other", icon: "more-horizontal" });
  });

  it("parses a planned amount", () => {
    const row = { id: "p", trip_id: "t", category_id: "c", planned_amount: "75.5" };
    expect(toPlannedBudget(row as never).planned_amount).toBe(75.5);
  });
});
