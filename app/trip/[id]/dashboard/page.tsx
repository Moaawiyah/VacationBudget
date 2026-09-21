import { notFound } from "next/navigation";
import { CalendarDays, CreditCard, TrendingUp } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { translateCategoryName } from "@/lib/i18n/category-names";
import { groupExpensesByCategory } from "@/lib/calculations/expenses";
import {
  calculateTripDays,
  calculateRemainingDays,
  calculateTripStatus,
} from "@/lib/calculations/trip";
import { formatCurrency } from "@/lib/currency/format";
import { TripHero } from "@/components/dashboard/trip-hero";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentExpenses } from "@/components/dashboard/recent-expenses";
import { CategoryChart } from "@/components/charts/category-chart";
import { StatCard } from "@/components/ui/stat-card";

export default async function TripDashboardPage({
  params,
}: PageProps<"/trip/[id]/dashboard">) {
  const { id } = await params;
  const sdk = await getSdk();
  const [trip, expenses, dict, locale] = await Promise.all([
    sdk.trips.get(id),
    sdk.expenses.listForTrip(id),
    getDictionary(),
    getLocale(),
  ]);
  if (!trip) notFound();
  const spent = expenses.reduce((sum, item) => sum + item.converted_amount, 0);
  const categories = groupExpensesByCategory(expenses).map((c) => ({
    ...c,
    name: translateCategoryName(c.name, dict),
  }));
  const days = calculateTripDays(trip.start_date, trip.end_date);
  const status = calculateTripStatus(trip.start_date, trip.end_date);
  const remaining =
    status === "upcoming" ? days : Math.min(days, calculateRemainingDays(trip.end_date));
  const elapsed =
    status === "upcoming" ? 0 : status === "completed" ? days : days - remaining + 1;
  return (
    <main className="flex flex-col gap-5 p-4 sm:p-7 lg:p-8">
      <header className="mb-1">
        <p className="text-primary mb-1 text-xs font-semibold tracking-[.18em] uppercase">
          {dict.travel.wallet}
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">
          {dict.travel.greeting}
        </h1>
        <p className="text-muted-foreground mt-2 hidden text-sm sm:block">
          {dict.travel.subtitle}
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
        <TripHero trip={trip} />
        <BudgetCard trip={trip} spent={spent} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={TrendingUp}
          label={dict.dashboard.averagePerDay}
          value={
            elapsed
              ? formatCurrency(spent / elapsed, trip.base_currency, LOCALE_BCP47[locale])
              : "—"
          }
        />
        <StatCard
          icon={CalendarDays}
          label={dict.dashboard.remainingDays}
          value={String(remaining)}
        />
        <div className="hidden sm:block">
          <StatCard
            icon={CreditCard}
            label={dict.travel.totalExpenses}
            value={String(expenses.length)}
          />
        </div>
      </div>
      <QuickActions tripId={id} />
      <div className="grid gap-5 xl:grid-cols-2">
        <CategoryChart data={categories} currency={trip.base_currency} />
        <RecentExpenses tripId={id} expenses={expenses} currency={trip.base_currency} />
      </div>
    </main>
  );
}
