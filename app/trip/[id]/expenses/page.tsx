import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt, ScanLine } from "lucide-react";
import { getSdk, requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseSavedToast } from "@/components/expenses/expense-saved-toast";
import { payerNameMap } from "@/components/expenses/payer-label";

export default async function ExpensesPage({ params }: PageProps<"/trip/[id]/expenses">) {
  const { id } = await params;
  const sdk = await getSdk();
  const { user } = await requireUser();

  const [trip, categories, expenses, dict, companionResult] = await Promise.all([
    sdk.trips.get(id),
    sdk.categories.list(),
    sdk.expenses.listForTrip(id),
    getDictionary(),
    sdk.companions.listForTrip(user.id, id),
  ]);

  if (!trip) notFound();
  // Names are a nicety: if they can't be loaded, the list still renders, just without "Paid by".
  const payerNames =
    "error" in companionResult ? undefined : payerNameMap(companionResult.companions);

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <Suspense fallback={null}>
        <ExpenseSavedToast />
      </Suspense>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
          <Receipt aria-hidden className="text-primary h-5 w-5 shrink-0" />
          {dict.expenses.title}
        </h1>
        <Link
          href={`/trip/${id}/expenses/receipt`}
          className="border-border text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
        >
          <ScanLine aria-hidden className="h-4 w-4 shrink-0" />
          {dict.receipts.scanReceipt}
        </Link>
      </div>
      <Link
        href={`/trip/${id}/expenses/new`}
        className="bg-primary text-primary-foreground w-fit rounded-full px-4 py-2 text-sm font-medium"
      >
        + {dict.expenses.addExpense}
      </Link>
      <ExpenseList
        tripId={id}
        expenses={expenses}
        categories={categories}
        baseCurrency={trip.base_currency}
        payerNames={payerNames}
        currentUserId={user.id}
      />
    </main>
  );
}
