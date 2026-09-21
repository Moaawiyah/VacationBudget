import type { Trip } from "@/types/trip";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { formatCurrency } from "@/lib/currency/format";
import { ProgressBar } from "@/components/ui/progress-bar";

export async function BudgetCard({ trip, spent }: { trip: Trip; spent: number }) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const money = (n: number) =>
    formatCurrency(n, trip.base_currency, LOCALE_BCP47[locale]);
  const remaining = trip.total_budget - spent;
  const percent = trip.total_budget > 0 ? (spent / trip.total_budget) * 100 : 0;
  return (
    <section className="panel flex flex-col justify-center gap-4 sm:p-7">
      <div className="flex justify-between text-sm">
        <h2 className="font-medium">{dict.dashboard.budget}</h2>
        <span className="font-semibold">{money(trip.total_budget)}</span>
      </div>
      <div>
        <p
          className={`text-4xl font-semibold tracking-tight ${remaining < 0 ? "text-danger" : ""}`}
        >
          {money(remaining)}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">{dict.dashboard.remaining}</p>
      </div>
      <ProgressBar value={percent} />
      <div className="text-muted-foreground flex justify-between gap-3 text-xs">
        <span>
          {money(spent)} {dict.dashboard.spent.toLowerCase()}
        </span>
        <span>
          {Math.round(percent)}% {dict.dashboard.budgetUsed.toLowerCase()}
        </span>
      </div>
    </section>
  );
}
