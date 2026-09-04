import { notFound } from "next/navigation";
import { getTrip } from "@/lib/data/trips";
import { getCategories } from "@/lib/data/categories";
import { getExpensesForTrip } from "@/lib/data/expenses";
import { getPlannedBudgetsForTrip } from "@/lib/data/planned-budgets";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { translateCategoryName } from "@/lib/i18n/category-names";
import { interpolate } from "@/lib/i18n/interpolate";
import { groupExpensesByCategory } from "@/lib/calculations/expenses";
import { formatCurrency } from "@/lib/currency/format";
import { PlanCategoryRow } from "@/components/plan/plan-category-row";
import { cn } from "@/lib/utils";

export default async function TripPlanPage({ params }: PageProps<"/trip/[id]/plan">) {
  const { id } = await params;
  const [trip, categories, expenses, plannedBudgets, dict, locale] = await Promise.all([
    getTrip(id),
    getCategories(),
    getExpensesForTrip(id),
    getPlannedBudgetsForTrip(id),
    getDictionary(),
    getLocale(),
  ]);
  const bcp47 = LOCALE_BCP47[locale];

  if (!trip) notFound();

  const actualByCategory = new Map(
    groupExpensesByCategory(expenses).map((c) => [c.categoryId, c.amount]),
  );
  const plannedByCategory = new Map(
    plannedBudgets.map((p) => [p.category_id, p.planned_amount]),
  );

  const totalPlanned = plannedBudgets.reduce((sum, p) => sum + p.planned_amount, 0);
  const totalActual = expenses.reduce(
    (sum, expense) => sum + expense.converted_amount,
    0,
  );
  const isOverTripBudget = totalPlanned > trip.total_budget;

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <div className="border-border bg-card rounded-3xl border p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-muted-foreground text-sm">{dict.plan.totalPlanned}</p>
          <p
            className={cn(
              "text-lg font-semibold",
              isOverTripBudget ? "text-danger" : "text-card-foreground",
            )}
          >
            {formatCurrency(totalPlanned, trip.base_currency, bcp47)}
          </p>
        </div>
        <div className="text-muted-foreground mt-1 flex items-baseline justify-between text-sm">
          <span>
            {interpolate(dict.plan.ofBudget, {
              budget: formatCurrency(trip.total_budget, trip.base_currency, bcp47),
            })}
          </span>
          <span>
            {interpolate(dict.plan.actualTotal, {
              amount: formatCurrency(totalActual, trip.base_currency, bcp47),
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <PlanCategoryRow
            key={category.id}
            tripId={id}
            categoryId={category.id}
            categoryName={translateCategoryName(category.name, dict)}
            icon={category.icon}
            currency={trip.base_currency}
            plannedAmount={plannedByCategory.get(category.id) ?? 0}
            actualAmount={actualByCategory.get(category.id) ?? 0}
          />
        ))}
      </div>
    </main>
  );
}
