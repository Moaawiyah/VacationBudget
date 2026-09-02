import type { Trip } from "@/types/trip";
import type { ExpenseWithCategory } from "@/types/expense";
import { calculateTripDays, calculateFlatDailyTarget } from "@/lib/calculations/trip";
import { groupExpensesByDate } from "@/lib/calculations/expenses";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateHeading } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export function DailySpendingList({
  trip,
  expenses,
}: {
  trip: Trip;
  expenses: ExpenseWithCategory[];
}) {
  const totalTripDays = calculateTripDays(trip.start_date, trip.end_date);
  const target = calculateFlatDailyTarget(trip.total_budget, totalTripDays);
  // Most recent first, newest days matter most while the trip is in progress.
  const days = groupExpensesByDate(expenses).sort((a, b) => b.date.localeCompare(a.date));

  if (days.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-medium">Daily spending</h2>
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
                  {formatDateHeading(day.date)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Spent {formatCurrency(day.amount, trip.base_currency)} · Target{" "}
                  {formatCurrency(target, trip.base_currency)}
                </p>
              </div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isOver ? "text-danger" : "text-success",
                )}
              >
                {formatCurrency(Math.abs(diff), trip.base_currency)}{" "}
                {isOver ? "over" : "under"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
