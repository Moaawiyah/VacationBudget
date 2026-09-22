import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptText, ScanLine } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { NewExpenseForm } from "@/components/expenses/new-expense-form";

export default async function NewExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/new">) {
  const { id } = await params;
  const sdk = await getSdk();
  const user = await sdk.auth.getUser();
  const [trip, categories, dict, companionResult] = await Promise.all([
    sdk.trips.get(id),
    sdk.categories.listPickable(user?.id ?? ""),
    getDictionary(),
    user ? sdk.companions.listForTrip(user.id, id) : Promise.resolve({ error: "" }),
  ]);

  if (!trip || !user) notFound();
  const companions = "companions" in companionResult ? companionResult.companions : [];

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
          <ReceiptText aria-hidden className="text-primary h-5 w-5 shrink-0" />
          {dict.expenses.addExpense}
        </h1>
        <Link
          href={`/trip/${id}/expenses/receipt`}
          className="border-border text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
        >
          <ScanLine aria-hidden className="h-4 w-4 shrink-0" />
          {dict.receipts.scanReceipt}
        </Link>
      </div>
      <NewExpenseForm
        tripId={id}
        baseCurrency={trip.base_currency}
        categories={categories}
        currentUserId={user.id}
        companions={companions}
      />
    </main>
  );
}
