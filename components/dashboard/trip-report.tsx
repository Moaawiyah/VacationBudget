import {
  Calculator,
  CalendarDays,
  CircleCheck,
  CreditCard,
  Receipt,
  Tag,
  Wallet,
} from "lucide-react";
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
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { translateCategoryName } from "@/lib/i18n/category-names";
import { StatCard } from "@/components/ui/stat-card";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { cn } from "@/lib/utils";

export async function TripReport({
  trip,
  expenses,
}: {
  trip: Trip;
  expenses: ExpenseWithCategory[];
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const bcp47 = LOCALE_BCP47[locale];
  const d = dict.dashboard;
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.converted_amount, 0);
  const totalTripDays = calculateTripDays(trip.start_date, trip.end_date);
  const remaining = calculateRemainingBudget(trip.total_budget, totalSpent);
  const avgPerDay = calculateAverageDailySpend(totalSpent, totalTripDays);
  const highestDay = findHighestSpendingDay(expenses);
  const largestExpense = findLargestExpense(expenses);
  const topCategory = findMostExpensiveCategory(expenses);
  const categoryBreakdown = groupExpensesByCategory(expenses).map((c) => ({
    ...c,
    name: translateCategoryName(c.name, dict),
  }));
  const isOver = remaining < 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-3xl border p-5 text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
          <CircleCheck aria-hidden className="h-6 w-6" />
        </div>
        <p className="text-muted-foreground text-sm">{d.tripCompleted}</p>
        <p
          className={cn(
            "mt-1 text-3xl font-semibold",
            isOver ? "text-danger" : "text-success",
          )}
        >
          {formatCurrency(Math.abs(remaining), trip.base_currency, bcp47)}
        </p>
        <p className="text-muted-foreground text-sm">{isOver ? d.overBudget : d.saved}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={d.originalBudget}
          icon={Wallet}
          value={formatCurrency(trip.total_budget, trip.base_currency, bcp47)}
        />
        <StatCard
          label={d.finalSpending}
          icon={CreditCard}
          value={formatCurrency(totalSpent, trip.base_currency, bcp47)}
        />
        <StatCard
          label={d.averagePerDay}
          icon={Calculator}
          value={formatCurrency(avgPerDay, trip.base_currency, bcp47)}
        />
        {highestDay && (
          <StatCard
            label={d.highestSpendingDay}
            icon={CalendarDays}
            value={formatCurrency(highestDay.amount, trip.base_currency, bcp47)}
            sublabel={formatDateHeading(
              highestDay.date,
              bcp47,
              dict.expenses.today,
              dict.expenses.yesterday,
            )}
          />
        )}
      </div>

      {largestExpense && (
        <StatCard
          label={d.largestExpense}
          icon={Receipt}
          value={formatCurrency(
            largestExpense.converted_amount,
            trip.base_currency,
            bcp47,
          )}
          sublabel={`${largestExpense.description} · ${translateCategoryName(largestExpense.category.name, dict)}`}
        />
      )}

      {topCategory && (
        <StatCard
          label={d.mostExpensiveCategory}
          icon={Tag}
          value={translateCategoryName(topCategory.name, dict)}
          sublabel={formatCurrency(topCategory.amount, trip.base_currency, bcp47)}
        />
      )}

      <CategoryBarChart data={categoryBreakdown} currency={trip.base_currency} />
    </div>
  );
}
