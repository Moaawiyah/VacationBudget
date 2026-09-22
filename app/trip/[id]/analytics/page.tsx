import { notFound } from "next/navigation";
import { getSdk, requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { translateCategoryName } from "@/lib/i18n/category-names";
import { calculateTripStatus } from "@/lib/calculations/trip";
import {
  groupExpensesByCategory,
  groupExpensesByDate,
  mergePlannedAndActual,
} from "@/lib/calculations/expenses";
import { calculateBalances } from "@/lib/finance/balances";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { TripCountdown } from "@/components/dashboard/trip-countdown";
import { DailySpendingList } from "@/components/dashboard/daily-spending-list";
import { TripReport } from "@/components/dashboard/trip-report";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { DailyBarChart } from "@/components/charts/daily-bar-chart";
import { PlannedActualChart } from "@/components/charts/planned-actual-chart";
import { TravelerBarChart } from "@/components/charts/traveler-bar-chart";

// Header + back link live in the shared trip/[id]/layout.tsx.
export default async function TripDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sdk = await getSdk();
  const { user } = await requireUser();
  const [trip, categories, expenses, expensesWithSplits, plannedBudgets, dict, companionResult] =
    await Promise.all([
      sdk.trips.get(id),
      sdk.categories.list(),
      sdk.expenses.listForTrip(id),
      sdk.expenses.listWithSplitsForTrip(id),
      sdk.plannedBudgets.listForTrip(id),
      getDictionary(),
      sdk.companions.listForTrip(user.id, id),
    ]);

  if (!trip) notFound();
  const companions = "companions" in companionResult ? companionResult.companions : [];
  const companionsById = new Map(companions.map((c) => [c.userId, c]));
  const travelerBalances = calculateBalances(trip.base_currency, expensesWithSplits);

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
      <h1 className="text-2xl font-semibold">{dict.travel.analytics}</h1>
      {status === "upcoming" && (
        <details className="panel">
          <summary className="cursor-pointer text-sm font-medium">
            {dict.dashboard.tripStartsIn}
          </summary>
          <div className="mt-4">
            <TripCountdown trip={trip} totalSpentSoFar={totalSpent} />
          </div>
        </details>
      )}
      <BudgetOverview trip={trip} totalSpent={totalSpent} totalPlanned={totalPlanned} />
      {expenses.length === 0 && (
        <p className="panel text-muted-foreground text-center text-sm">
          {dict.expenses.noExpensesTitle}
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <DailyBarChart
          data={groupExpensesByDate(expenses)}
          currency={trip.base_currency}
        />
        <CategoryBarChart data={categoryBreakdown} currency={trip.base_currency} />
        <PlannedActualChart data={plannedActual} currency={trip.base_currency} />
        <TravelerBarChart
          balances={travelerBalances}
          companions={companionsById}
          currency={trip.base_currency}
        />
        <DailySpendingList trip={trip} expenses={expenses} />
      </div>
      {status === "completed" && <TripReport trip={trip} expenses={expenses} />}
    </main>
  );
}
