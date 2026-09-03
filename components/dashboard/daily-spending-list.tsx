import type { Trip } from "@/types/trip";
import type { ExpenseWithCategory } from "@/types/expense";
import { calculateTripDays, calculateFlatDailyTarget } from "@/lib/calculations/trip";
import { groupExpensesByDate } from "@/lib/calculations/expenses";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateHeading } from "@/lib/format-date";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

export async function DailySpendingList({
  trip,
  expenses,
}: {
  trip: Trip;
  expenses: ExpenseWithCategory[];
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const bcp47 = LOCALE_BCP47[locale];
  const d = dict.dashboard;
  const totalTripDays = calculateTripDays(trip.start_date, trip.end_date);
  const target = calculateFlatDailyTarget(trip.total_budget, totalTripDays);
  // Most recent first, newest days matter most while the trip is in progress.
  const days = groupExpensesByDate(expenses).sort((a, b) => b.date.localeCompare(a.date));

  if (days.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-medium">{d.dailySpending}</h2>
      <div className="flex flex-col gap-2">
        {days.map((day) => {
          const diff = target - day.amount;
          const isOver = diff < 0;
          return (
            <div
              key={day.date}
              className="border-border bg-card flex items-center justify-between rounded-2xl border p-3"
            >
              <div>
                <p className="text-card-foreground text-sm font-medium">
                  {formatDateHeading(
                    day.date,
                    bcp47,
                    dict.expenses.today,
                    dict.expenses.yesterday,
                  )}
                </p>
                <p className="text-muted-foreground text-xs">
                  {interpolate(d.spentTarget, {
                    spent: formatCurrency(day.amount, trip.base_currency, bcp47),
                    target: formatCurrency(target, trip.base_currency, bcp47),
                  })}
                </p>
              </div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isOver ? "text-danger" : "text-success",
                )}
              >
                {formatCurrency(Math.abs(diff), trip.base_currency, bcp47)}{" "}
                {isOver ? d.over : d.under}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
