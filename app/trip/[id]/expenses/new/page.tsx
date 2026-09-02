import { notFound } from "next/navigation";
import { getTrip } from "@/lib/data/trips";
import { getCategories } from "@/lib/data/categories";
import { NewExpenseForm } from "@/components/expenses/new-expense-form";

export default async function NewExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/new">) {
  const { id } = await params;
  const [trip, categories] = await Promise.all([getTrip(id), getCategories()]);

  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground text-xl font-semibold">Add expense</h1>
      <NewExpenseForm
        tripId={id}
        baseCurrency={trip.base_currency}
        categories={categories}
      />
    </main>
  );
}
