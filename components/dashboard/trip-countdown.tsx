import type { Trip } from "@/types/trip";
import { calculateDaysUntilStart } from "@/lib/calculations/trip";
import { formatCurrency } from "@/lib/currency/format";
import { StatCard } from "@/components/ui/stat-card";

export function TripCountdown({
  trip,
  totalSpentSoFar,
}: {
  trip: Trip;
  totalSpentSoFar: number;
}) {
  const daysUntil = calculateDaysUntilStart(trip.start_date);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-3xl border p-6 text-center">
        <p className="text-muted-foreground text-sm">Trip starts in</p>
        <p className="text-card-foreground mt-1 text-4xl font-semibold">{daysUntil}</p>
        <p className="text-muted-foreground text-sm">
          {daysUntil === 1 ? "day" : "days"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Budget"
          value={formatCurrency(trip.total_budget, trip.base_currency)}
        />
        <StatCard
          label="Already spent"
          value={formatCurrency(totalSpentSoFar, trip.base_currency)}
          sublabel="Pre-trip purchases"
        />
      </div>
    </div>
  );
}
