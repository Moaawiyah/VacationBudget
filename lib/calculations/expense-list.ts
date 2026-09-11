import type { ExpenseWithCategory } from "@/types/expense";

/** Category filter value meaning "every category". */
export const ALL_CATEGORIES = "all";

/**
 * Expenses whose description or merchant contains `search` (case-insensitive)
 * and that belong to `categoryId` (or any category, for ALL_CATEGORIES).
 */
export function filterExpenses(
  expenses: ExpenseWithCategory[],
  search: string,
  categoryId: string,
): ExpenseWithCategory[] {
  const query = search.trim().toLowerCase();
  return expenses.filter((expense) => {
    const matchesSearch =
      query === "" ||
      expense.description.toLowerCase().includes(query) ||
      (expense.merchant ?? "").toLowerCase().includes(query);
    const matchesCategory =
      categoryId === ALL_CATEGORIES || expense.category_id === categoryId;
    return matchesSearch && matchesCategory;
  });
}

/**
 * Groups expenses into [date, expenses] pairs, keeping the input order — the
 * list arrives sorted newest-first from the server, so no re-sort is needed.
 */
export function groupExpensesByDay(
  expenses: ExpenseWithCategory[],
): Array<[string, ExpenseWithCategory[]]> {
  const byDay = new Map<string, ExpenseWithCategory[]>();
  for (const expense of expenses) {
    const list = byDay.get(expense.expense_date) ?? [];
    list.push(expense);
    byDay.set(expense.expense_date, list);
  }
  return Array.from(byDay.entries());
}
