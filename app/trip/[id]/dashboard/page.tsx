import { notFound } from "next/navigation";
import { getTrip } from "@/lib/data/trips";
import { getExpensesForTrip } from "@/lib/data/expenses";
import { getPlannedBudgetsForTrip } from "@/lib/data/planned-budgets";
import { calculateTripStatus } from "@/lib/calculations/trip";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { TripCountdown } from "@/components/dashboard/trip-countdown";
import { DailySpendingList } from "@/components/dashboard/daily-spending-list";
import { TripReport } from "@/components/dashboard/trip-report";

// Header + back link live in the shared trip/[id]/layout.tsx.
export default async function TripDashboardPage({
  params,
}: PageProps<"/trip/[id]/dashboard">) {
  const { id } = await params;
  const [trip, expenses, plannedBudgets] = await Promise.all([
    getTrip(id),
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
          <DailySpendingList trip={trip} expenses={expenses} />
        </>
      )}
      {status === "completed" && <TripReport trip={trip} expenses={expenses} />}
    </main>
  );
}
