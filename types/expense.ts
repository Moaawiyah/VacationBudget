import type { Database } from "@/types/database";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

/** Same reasoning as types/trip.ts: numeric columns arrive as strings. */
export type Expense = Omit<
  ExpenseRow,
  "amount" | "converted_amount" | "exchange_rate"
> & {
  amount: number;
  converted_amount: number;
  exchange_rate: number;
};

export function toExpense(row: ExpenseRow): Expense {
  return {
    ...row,
    amount: Number(row.amount),
    converted_amount: Number(row.converted_amount),
    exchange_rate: Number(row.exchange_rate),
  };
}

export type ExpenseWithCategory = Expense & {
  category: { name: string; icon: string };
};

export function toExpenseWithCategory(
  row: ExpenseRow & { categories: { name: string; icon: string } | null },
): ExpenseWithCategory {
  const { categories, ...rest } = row;
  return {
    ...toExpense(rest),
    category: categories ?? { name: "Other", icon: "more-horizontal" },
  };
}
