import Link from "next/link";
import { MapPin, Calendar, Pencil } from "lucide-react";
import type { Trip, TripStatus } from "@/types/trip";
import { calculateTripStatus, calculateRemainingBudget } from "@/lib/calculations/trip";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateRange } from "@/lib/format-date";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<TripStatus, string> = {
  upcoming: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
};

// `spent` is the trip's total converted_amount across all expenses (summed
// by the caller — see app/trips/page.tsx).
export async function TripCard({ trip, spent = 0 }: { trip: Trip; spent?: number }) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const bcp47 = LOCALE_BCP47[locale];
  const status = calculateTripStatus(trip.start_date, trip.end_date);
  const remaining = calculateRemainingBudget(trip.total_budget, spent);
  const progress = trip.total_budget > 0 ? (spent / trip.total_budget) * 100 : 0;
  const statusLabel: Record<TripStatus, string> = {
    upcoming: dict.trips.statusUpcoming,
    active: dict.trips.statusActive,
    completed: dict.trips.statusCompleted,
  };

  return (
    <div className="border-border bg-card rounded-3xl border p-5 shadow-sm">
      <Link href={`/trip/${trip.id}/dashboard`} className="block">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-card-foreground text-lg font-semibold">{trip.name}</h2>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
              STATUS_CLASS[status],
            )}
          >
            {statusLabel[status]}
          </span>
        </div>

        <div className="text-muted-foreground mt-2 flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{trip.destination}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDateRange(trip.start_date, trip.end_date, bcp47)}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-card-foreground">
              {formatCurrency(spent, trip.base_currency, bcp47)} {dict.trips.spent}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(trip.total_budget, trip.base_currency, bcp47)}{" "}
              {dict.trips.budget}
            </span>
          </div>
          <ProgressBar value={progress} className="mt-2" />
          <p className="text-muted-foreground mt-1.5 text-xs">
            {formatCurrency(remaining, trip.base_currency, bcp47)} {dict.trips.remaining}
          </p>
        </div>
      </Link>

      <div className="border-border mt-4 flex gap-2 border-t pt-3">
        <Link
          href={`/trips/${trip.id}/edit`}
          className="text-muted-foreground flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-opacity active:opacity-60"
        >
          <Pencil className="h-4 w-4" />
          {dict.common.edit}
        </Link>
        <DeleteTripButton tripId={trip.id} tripName={trip.name} />
      </div>
    </div>
  );
}
