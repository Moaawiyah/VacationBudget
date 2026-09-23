import { notFound } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/currency/format";
import { EditExpenseForm } from "@/components/expenses/edit-expense-form";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";

export default async function EditExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/[expenseId]/edit">) {
  const { id, expenseId } = await params;
  const sdk = await getSdk();
  const user = await sdk.auth.getUser();

  const [trip, dict, locale, expense] = await Promise.all([
    sdk.trips.get(id),
    getDictionary(),
    getLocale(),
    // Scoped to this trip: an expenseId from another trip 404s here.
    sdk.expenses.get(id, expenseId),
  ]);

  if (!trip || !expense) notFound();

  // Mirrors the 0009 + 0014 RLS rule (author, payer, or trip owner) so a
  // member sees a read-only view of someone else's expense instead of a
  // form that would only ever be refused. RLS still decides; this just
  // avoids the dead end.
  const canEdit =
    Boolean(user) &&
    (expense.user_id === user!.id ||
      expense.paid_by === user!.id ||
      trip.user_id === user!.id);

  if (!canEdit) {
    return (
      <main className="safe-x flex flex-1 flex-col gap-4 p-6">
        <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
          <Eye aria-hidden className="text-primary h-5 w-5 shrink-0" />
          {dict.expenses.viewExpenseTitle}
        </h1>
        <div className="border-border bg-card flex flex-col gap-1 rounded-2xl border p-4">
          <p className="text-card-foreground font-medium">{expense.description}</p>
          <p className="text-card-foreground text-2xl font-semibold">
            {formatCurrency(expense.amount, expense.currency, LOCALE_BCP47[locale])}
          </p>
          <p className="text-muted-foreground text-sm">{expense.expense_date}</p>
          {expense.notes && (
            <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
              {expense.notes}
            </p>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{dict.expenses.readOnlyNotice}</p>
      </main>
    );
  }

  const [categories, companionResult, splits] = await Promise.all([
    sdk.categories.listPickable(user!.id, expense.category_id),
    sdk.companions.listForTrip(user!.id, id),
    sdk.expenses.getSplits(expense.id),
  ]);
  const companions = "companions" in companionResult ? companionResult.companions : [];

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
        currentUserId={user!.id}
        companions={companions}
        expense={expense}
        splits={splits}
      />
      <DeleteExpenseButton tripId={id} expenseId={expenseId} />
    </main>
  );
}
