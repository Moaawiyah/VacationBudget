import type { Trip } from "@/types/trip";
import type { ExpenseWithCategory } from "@/types/expense";
import {
  calculateTripDays,
  calculateRemainingBudget,
  calculateAverageDailySpend,
} from "@/lib/calculations/trip";
import {
  findHighestSpendingDay,
  findLargestExpense,
  findMostExpensiveCategory,
  groupExpensesByCategory,
} from "@/lib/calculations/expenses";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateHeading } from "@/lib/format-date";
import { getCategoryIcon } from "@/lib/icons";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

export function TripReport({
  trip,
  expenses,
}: {
  trip: Trip;
  expenses: ExpenseWithCategory[];
}) {
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.converted_amount, 0);
  const totalTripDays = calculateTripDays(trip.start_date, trip.end_date);
  const remaining = calculateRemainingBudget(trip.total_budget, totalSpent);
  const avgPerDay = calculateAverageDailySpend(totalSpent, totalTripDays);
  const highestDay = findHighestSpendingDay(expenses);
  const largestExpense = findLargestExpense(expenses);
  const topCategory = findMostExpensiveCategory(expenses);
  const categoryBreakdown = groupExpensesByCategory(expenses);
  const isOver = remaining < 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-3xl border p-5 text-center">
        <p className="text-muted-foreground text-sm">Trip completed</p>
        <p
          className={cn(
            "mt-1 text-3xl font-semibold",
            isOver ? "text-danger" : "text-success",
          )}
        >
          {formatCurrency(Math.abs(remaining), trip.base_currency)}
        </p>
        <p className="text-muted-foreground text-sm">
          {isOver ? "over budget" : "saved"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Original budget"
          value={formatCurrency(trip.total_budget, trip.base_currency)}
        />
        <StatCard
          label="Final spending"
          value={formatCurrency(totalSpent, trip.base_currency)}
        />
        <StatCard
          label="Average per day"
          value={formatCurrency(avgPerDay, trip.base_currency)}
        />
        {highestDay && (
          <StatCard
            label="Highest spending day"
            value={formatCurrency(highestDay.amount, trip.base_currency)}
            sublabel={formatDateHeading(highestDay.date)}
          />
        )}
      </div>

      {largestExpense && (
        <StatCard
          label="Largest expense"
          value={formatCurrency(largestExpense.converted_amount, trip.base_currency)}
          sublabel={`${largestExpense.description} · ${largestExpense.category.name}`}
        />
      )}

      {topCategory && (
        <StatCard
          label="Most expensive category"
          value={topCategory.name}
          sublabel={formatCurrency(topCategory.amount, trip.base_currency)}
        />
      )}

      {categoryBreakdown.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-sm font-medium">By category</h2>
          <div className="flex flex-col gap-2">
            {categoryBreakdown.map((category) => {
              const Icon = getCategoryIcon(category.icon);
              return (
                <div
                  key={category.categoryId}
                  className="border-border bg-card flex items-center gap-3 rounded-2xl border p-3"
                >
                  <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="text-muted-foreground h-4 w-4" />
                  </div>
                  <p className="text-card-foreground flex-1 text-sm font-medium">
                    {category.name}
                  </p>
                  <p className="text-card-foreground text-sm font-semibold">
                    {formatCurrency(category.amount, trip.base_currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
