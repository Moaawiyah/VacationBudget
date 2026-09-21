import Link from "next/link";
import { ExpenseRow } from "@/components/expenses/expense-row";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import type { ExpenseWithCategory } from "@/types/expense";

export async function RecentExpenses({
  tripId,
  expenses,
  currency,
}: {
  tripId: string;
  expenses: ExpenseWithCategory[];
  currency: string;
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const recent = [...expenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 4);
  return (
    <section className="panel h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{dict.travel.recentExpenses}</h2>
        <Link
          href={`/trip/${tripId}/expenses`}
          className="text-primary text-xs font-medium"
        >
          {dict.travel.viewAll}
        </Link>
      </div>
      {recent.length ? (
        <div className="space-y-2">
          {recent.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              tripId={tripId}
              baseCurrency={currency}
              dict={dict}
              bcp47={LOCALE_BCP47[locale]}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {dict.expenses.noExpensesTitle}
        </p>
      )}
    </section>
  );
}
