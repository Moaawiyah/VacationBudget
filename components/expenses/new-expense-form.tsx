"use client";

import { createExpense } from "@/app/trip/[id]/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import type { Category } from "@/types/category";

export function NewExpenseForm({
  tripId,
  baseCurrency,
  categories,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
}) {
  return (
    <ExpenseForm
      tripId={tripId}
      baseCurrency={baseCurrency}
      categories={categories}
      onSubmit={(data) => createExpense(tripId, data)}
      submitLabel="Save expense"
      rememberCategory
    />
  );
}
