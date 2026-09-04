"use client";

import { createExpense } from "@/app/trip/[id]/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useDictionary } from "@/components/i18n/locale-provider";
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
  const dict = useDictionary();
  return (
    <ExpenseForm
      tripId={tripId}
      baseCurrency={baseCurrency}
      categories={categories}
      onSubmit={(data) => createExpense(tripId, data)}
      submitLabel={dict.expenseForm.saveExpense}
      rememberCategory
    />
  );
}
