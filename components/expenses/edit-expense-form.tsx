"use client";

import { updateExpense } from "@/app/trip/[id]/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useDictionary } from "@/components/i18n/locale-provider";
import type { Category } from "@/types/category";
import type { Companion } from "@/types/companion";
import type { Expense } from "@/types/expense";
import type { ExpenseSplit } from "@/lib/sdk/expense-service";
import { splitStateFromExpense } from "./split-state";

export function EditExpenseForm({
  tripId,
  baseCurrency,
  categories,
  currentUserId,
  companions,
  expense,
  splits,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  currentUserId: string;
  companions: Companion[];
  expense: Expense;
  splits: ExpenseSplit[];
}) {
  const dict = useDictionary();
  return (
    <ExpenseForm
      tripId={tripId}
      baseCurrency={baseCurrency}
      categories={categories}
      currentUserId={currentUserId}
      companions={companions}
      initialSplit={splitStateFromExpense(expense, splits)}
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
      submitLabel={dict.expenseForm.saveChanges}
    />
  );
}
