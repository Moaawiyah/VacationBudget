import { notFound } from "next/navigation";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { translateCategoryName } from "@/lib/i18n/category-names";
import { calculateTripStatus } from "@/lib/calculations/trip";
import {
  groupExpensesByCategory,
  groupExpensesByDate,
  mergePlannedAndActual,
} from "@/lib/calculations/expenses";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { TripCountdown } from "@/components/dashboard/trip-countdown";
import { DailySpendingList } from "@/components/dashboard/daily-spending-list";
import { TripReport } from "@/components/dashboard/trip-report";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { DailyBarChart } from "@/components/charts/daily-bar-chart";
import { PlannedActualChart } from "@/components/charts/planned-actual-chart";

// Header + back link live in the shared trip/[id]/layout.tsx.
export default async function TripDashboardPage({
  params,
}: PageProps<"/trip/[id]/dashboard">) {
  const { id } = await params;
  const sdk = await getSdk();
  const [trip, categories, expenses, plannedBudgets, dict] = await Promise.all([
    sdk.trips.get(id),
    sdk.categories.list(),
    sdk.expenses.listForTrip(id),
    sdk.plannedBudgets.listForTrip(id),
    getDictionary(),
  ]);

  if (!trip) notFound();

  const status = calculateTripStatus(trip.start_date, trip.end_date);
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.converted_amount, 0);
  const totalPlanned = plannedBudgets.reduce((sum, p) => sum + p.planned_amount, 0);
  const categoryBreakdown = groupExpensesByCategory(expenses).map((c) => ({
    ...c,
    name: translateCategoryName(c.name, dict),
  }));
  const plannedActual = mergePlannedAndActual(categories, plannedBudgets, expenses).map(
    (c) => ({ ...c, name: translateCategoryName(c.name, dict) }),
  );

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      {status === "upcoming" && (
        <TripCountdown trip={trip} totalSpentSoFar={totalSpent} />
      )}
      {status === "active" && (
        <>
          <BudgetOverview
            trip={trip}
            totalSpent={totalSpent}
            totalPlanned={totalPlanned}
          />
          <CategoryBarChart data={categoryBreakdown} currency={trip.base_currency} />
          <PlannedActualChart data={plannedActual} currency={trip.base_currency} />
          <DailyBarChart
            data={groupExpensesByDate(expenses)}
            currency={trip.base_currency}
          />
          <DailySpendingList trip={trip} expenses={expenses} />
        </>
      )}
      {status === "completed" && <TripReport trip={trip} expenses={expenses} />}
    </main>
  );
}
