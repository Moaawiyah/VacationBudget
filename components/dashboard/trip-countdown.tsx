import { CreditCard, Hourglass, Wallet } from "lucide-react";
import type { Trip } from "@/types/trip";
import { calculateDaysUntilStart } from "@/lib/calculations/trip";
import { formatCurrency } from "@/lib/currency/format";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { StatCard } from "@/components/ui/stat-card";

export async function TripCountdown({
  trip,
  totalSpentSoFar,
}: {
  trip: Trip;
  totalSpentSoFar: number;
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const bcp47 = LOCALE_BCP47[locale];
  const d = dict.dashboard;
  const daysUntil = calculateDaysUntilStart(trip.start_date);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-3xl border p-6 text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
          <Hourglass aria-hidden className="h-6 w-6" />
        </div>
        <p className="text-muted-foreground text-sm">{d.tripStartsIn}</p>
        <p className="text-card-foreground mt-1 text-4xl font-semibold">{daysUntil}</p>
        <p className="text-muted-foreground text-sm">
          {daysUntil === 1 ? d.day : d.days}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={d.budget}
          icon={Wallet}
          value={formatCurrency(trip.total_budget, trip.base_currency, bcp47)}
        />
        <StatCard
          label={d.alreadySpent}
          icon={CreditCard}
          value={formatCurrency(totalSpentSoFar, trip.base_currency, bcp47)}
          sublabel={d.preTripPurchases}
        />
      </div>
    </div>
  );
}
