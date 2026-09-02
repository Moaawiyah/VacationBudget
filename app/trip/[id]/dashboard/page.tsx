import { notFound } from "next/navigation";
import { getTrip } from "@/lib/data/trips";
import { getCategories } from "@/lib/data/categories";
import { getExpensesForTrip } from "@/lib/data/expenses";
import { getPlannedBudgetsForTrip } from "@/lib/data/planned-budgets";
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
  const [trip, categories, expenses, plannedBudgets] = await Promise.all([
    getTrip(id),
    getCategories(),
    getExpensesForTrip(id),
    getPlannedBudgetsForTrip(id),
  ]);

  if (!trip) notFound();

  const status = calculateTripStatus(trip.start_date, trip.end_date);
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.converted_amount, 0);
  const totalPlanned = plannedBudgets.reduce((sum, p) => sum + p.planned_amount, 0);

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
          <CategoryBarChart
            data={groupExpensesByCategory(expenses)}
            currency={trip.base_currency}
          />
          <PlannedActualChart
            data={mergePlannedAndActual(categories, plannedBudgets, expenses)}
            currency={trip.base_currency}
          />
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
