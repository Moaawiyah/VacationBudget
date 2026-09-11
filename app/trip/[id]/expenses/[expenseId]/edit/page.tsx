import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrip } from "@/lib/data/trips";
import { getCategories } from "@/lib/data/categories";
import { getDictionary } from "@/lib/i18n/server";
import { toExpense } from "@/types/expense";
import { EditExpenseForm } from "@/components/expenses/edit-expense-form";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";

export default async function EditExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/[expenseId]/edit">) {
  const { id, expenseId } = await params;
  const supabase = await createClient();

  const [trip, categories, dict, { data: row }] = await Promise.all([
    getTrip(id),
    getCategories(),
    getDictionary(),
    // Scoped by trip_id too — an expenseId that doesn't belong to this trip
    // (stale link, edited URL) should 404, not silently edit/reprice the
    // wrong trip's expense against this trip's base_currency.
    supabase.from("expenses").select("*").eq("id", expenseId).eq("trip_id", id).single(),
  ]);

  if (!trip || !row) notFound();

  const expense = toExpense(row);

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
        <Pencil aria-hidden className="text-primary h-5 w-5 shrink-0" />
        {dict.expenses.editExpenseTitle}
      </h1>
      <EditExpenseForm
        tripId={id}
        baseCurrency={trip.base_currency}
        categories={categories}
        expense={expense}
      />
      <DeleteExpenseButton tripId={id} expenseId={expenseId} />
    </main>
  );
}
