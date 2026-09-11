import { notFound } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { NewExpenseForm } from "@/components/expenses/new-expense-form";

export default async function NewExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/new">) {
  const { id } = await params;
  const sdk = await getSdk();
  const [trip, categories, dict] = await Promise.all([
    sdk.trips.get(id),
    sdk.categories.list(),
    getDictionary(),
  ]);

  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
        <ReceiptText aria-hidden className="text-primary h-5 w-5 shrink-0" />
        {dict.expenses.addExpense}
      </h1>
      <NewExpenseForm
        tripId={id}
        baseCurrency={trip.base_currency}
        categories={categories}
      />
    </main>
  );
}
