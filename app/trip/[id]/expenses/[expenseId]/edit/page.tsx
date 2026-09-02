import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrip } from "@/lib/data/trips";
import { getCategories } from "@/lib/data/categories";
import { toExpense } from "@/types/expense";
import { EditExpenseForm } from "@/components/expenses/edit-expense-form";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";

export default async function EditExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/[expenseId]/edit">) {
  const { id, expenseId } = await params;
  const supabase = await createClient();

  const [trip, categories, { data: row }] = await Promise.all([
    getTrip(id),
    getCategories(),
    supabase.from("expenses").select("*").eq("id", expenseId).single(),
  ]);

  if (!trip || !row) notFound();

  const expense = toExpense(row);

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground text-xl font-semibold">Edit expense</h1>
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
