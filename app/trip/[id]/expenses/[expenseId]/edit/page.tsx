import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { EditExpenseForm } from "@/components/expenses/edit-expense-form";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";

export default async function EditExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/[expenseId]/edit">) {
  const { id, expenseId } = await params;
  const sdk = await getSdk();

  const [trip, categories, dict, expense] = await Promise.all([
    sdk.trips.get(id),
    sdk.categories.list(),
    getDictionary(),
    // Scoped to this trip: an expenseId from another trip 404s here.
    sdk.expenses.get(id, expenseId),
  ]);

  if (!trip || !expense) notFound();

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
