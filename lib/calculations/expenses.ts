import type { ExpenseWithCategory } from "@/types/expense";

export type DailySpend = { date: string; amount: number };

/** Total spent per calendar day, sorted earliest first. */
export function groupExpensesByDate(expenses: ExpenseWithCategory[]): DailySpend[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(
      expense.expense_date,
      (totals.get(expense.expense_date) ?? 0) + expense.converted_amount,
    );
  }
  return Array.from(totals, ([date, amount]) => ({ date, amount })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function findHighestSpendingDay(
  expenses: ExpenseWithCategory[],
): DailySpend | null {
  const byDate = groupExpensesByDate(expenses);
  if (byDate.length === 0) return null;
  return byDate.reduce((max, day) => (day.amount > max.amount ? day : max));
}

export function findLargestExpense(
  expenses: ExpenseWithCategory[],
): ExpenseWithCategory | null {
  if (expenses.length === 0) return null;
  return expenses.reduce((max, expense) =>
    expense.converted_amount > max.converted_amount ? expense : max,
  );
}

export type CategorySpend = {
  categoryId: string;
  name: string;
  icon: string;
  amount: number;
};

/** Total spent per category, sorted highest spend first. */
export function groupExpensesByCategory(
  expenses: ExpenseWithCategory[],
): CategorySpend[] {
  const totals = new Map<string, CategorySpend>();
  for (const expense of expenses) {
    const existing = totals.get(expense.category_id);
    if (existing) {
      existing.amount += expense.converted_amount;
    } else {
      totals.set(expense.category_id, {
        categoryId: expense.category_id,
        name: expense.category.name,
        icon: expense.category.icon,
        amount: expense.converted_amount,
      });
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
}

export function findMostExpensiveCategory(
  expenses: ExpenseWithCategory[],
): CategorySpend | null {
  return groupExpensesByCategory(expenses)[0] ?? null;
}
