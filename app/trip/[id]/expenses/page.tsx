import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTrip } from "@/lib/data/trips";
import { getCategories } from "@/lib/data/categories";
import { getExpensesForTrip } from "@/lib/data/expenses";
import { getDictionary } from "@/lib/i18n/server";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseSavedToast } from "@/components/expenses/expense-saved-toast";

export default async function ExpensesPage({ params }: PageProps<"/trip/[id]/expenses">) {
  const { id } = await params;

  const [trip, categories, expenses, dict] = await Promise.all([
    getTrip(id),
    getCategories(),
    getExpensesForTrip(id),
    getDictionary(),
  ]);

  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <Suspense fallback={null}>
        <ExpenseSavedToast />
      </Suspense>
      <h1 className="text-foreground text-xl font-semibold">{dict.expenses.title}</h1>
      <ExpenseList
        tripId={id}
        expenses={expenses}
        categories={categories}
        baseCurrency={trip.base_currency}
      />
    </main>
  );
}
