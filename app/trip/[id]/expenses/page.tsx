import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseSavedToast } from "@/components/expenses/expense-saved-toast";

export default async function ExpensesPage({ params }: PageProps<"/trip/[id]/expenses">) {
  const { id } = await params;
  const sdk = await getSdk();

  const [trip, categories, expenses, dict] = await Promise.all([
    sdk.trips.get(id),
    sdk.categories.list(),
    sdk.expenses.listForTrip(id),
    getDictionary(),
  ]);

  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <Suspense fallback={null}>
        <ExpenseSavedToast />
      </Suspense>
      <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
        <Receipt aria-hidden className="text-primary h-5 w-5 shrink-0" />
        {dict.expenses.title}
      </h1>
      <ExpenseList
        tripId={id}
        expenses={expenses}
        categories={categories}
        baseCurrency={trip.base_currency}
      />
    </main>
  );
}
