"use client";

import { createExpense } from "@/app/trip/[id]/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useDictionary } from "@/components/i18n/locale-provider";
import { useRequestId } from "@/components/expenses/use-request-id";
import type { Category } from "@/types/category";
import type { Companion } from "@/types/companion";

export function NewExpenseForm({
  tripId,
  baseCurrency,
  categories,
  currentUserId,
  companions,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  currentUserId: string;
  companions: Companion[];
}) {
  const dict = useDictionary();
  const requestId = useRequestId();
  return (
    <ExpenseForm
      tripId={tripId}
      baseCurrency={baseCurrency}
      categories={categories}
      currentUserId={currentUserId}
      companions={companions}
      onSubmit={(data) => createExpense(tripId, data, requestId)}
      submitLabel={dict.expenseForm.saveExpense}
      rememberCategory
    />
  );
}
