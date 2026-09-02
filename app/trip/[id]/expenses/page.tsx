import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrip } from "@/lib/data/trips";
import { getCategories } from "@/lib/data/categories";
import { toExpenseWithCategory } from "@/types/expense";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseSavedToast } from "@/components/expenses/expense-saved-toast";

export default async function ExpensesPage({ params }: PageProps<"/trip/[id]/expenses">) {
  const { id } = await params;
  const supabase = await createClient();

  const [trip, categories, { data: rows }] = await Promise.all([
    getTrip(id),
    getCategories(),
    supabase
      .from("expenses")
      .select("*, categories(name, icon)")
      .eq("trip_id", id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!trip) notFound();

  const expenses = (rows ?? []).map(toExpenseWithCategory);

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <Suspense fallback={null}>
        <ExpenseSavedToast />
      </Suspense>
      <h1 className="text-foreground text-xl font-semibold">Expenses</h1>
      <ExpenseList
        tripId={id}
        expenses={expenses}
        categories={categories}
        baseCurrency={trip.base_currency}
      />
    </main>
  );
}
