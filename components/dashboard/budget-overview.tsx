import type { Trip } from "@/types/trip";
import {
  calculateRemainingBudget,
  calculateRemainingDays,
  calculateDailyBudget,
} from "@/lib/calculations/trip";
import { formatCurrency } from "@/lib/currency/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";

export function BudgetOverview({
  trip,
  totalSpent,
  totalPlanned,
}: {
  trip: Trip;
  totalSpent: number;
  totalPlanned: number;
}) {
  const remaining = calculateRemainingBudget(trip.total_budget, totalSpent);
  const remainingDays = calculateRemainingDays(trip.end_date);
  const dailySafe = calculateDailyBudget(remaining, remainingDays);
  const percentUsed = trip.total_budget > 0 ? (totalSpent / trip.total_budget) * 100 : 0;
  const isOverBudget = remaining < 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-3xl border p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-muted-foreground text-sm">Budget used</p>
          <p className="text-muted-foreground text-sm font-medium">
            {Math.round(percentUsed)}% used
          </p>
        </div>
        <ProgressBar value={percentUsed} className="mt-3" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Budget"
          value={formatCurrency(trip.total_budget, trip.base_currency)}
        />
        <StatCard label="Spent" value={formatCurrency(totalSpent, trip.base_currency)} />
        <StatCard
          label="Remaining"
          value={formatCurrency(remaining, trip.base_currency)}
          tone={isOverBudget ? "danger" : "success"}
        />
        <StatCard
          label="Planned"
          value={formatCurrency(totalPlanned, trip.base_currency)}
        />
        <StatCard
          label="Remaining days"
          value={String(remainingDays)}
          sublabel={remainingDays === 1 ? "day left" : "days left"}
        />
        <StatCard
          label="Safe daily budget"
          value={`${formatCurrency(dailySafe, trip.base_currency)}/day`}
          tone={dailySafe < 0 ? "danger" : "default"}
        />
      </div>
    </div>
  );
}
