"use client";

import { updateExpense } from "@/app/trip/[id]/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import type { Category } from "@/types/category";
import type { Expense } from "@/types/expense";

export function EditExpenseForm({
  tripId,
  baseCurrency,
  categories,
  expense,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  expense: Expense;
}) {
  return (
    <ExpenseForm
      tripId={tripId}
      baseCurrency={baseCurrency}
      categories={categories}
      defaultValues={{
        amount: expense.amount,
        currency: expense.currency,
        exchange_rate:
          expense.currency === baseCurrency ? undefined : expense.exchange_rate,
        category_id: expense.category_id,
        description: expense.description,
        expense_date: expense.expense_date,
        merchant: expense.merchant ?? "",
        location: expense.location ?? "",
        notes: expense.notes ?? "",
      }}
      onSubmit={(data) => updateExpense(tripId, expense.id, data)}
      submitLabel="Save changes"
    />
  );
}
