import Link from "next/link";
import {
  Calendar,
  CircleCheck,
  Clock,
  MapPin,
  Pencil,
  PlaneTakeoff,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Trip, TripStatus } from "@/types/trip";
import { calculateTripStatus, calculateRemainingBudget } from "@/lib/calculations/trip";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateRange } from "@/lib/format-date";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { formatDestination } from "@/lib/countries";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";
import { TripCoverImage } from "@/components/trips/cover/trip-cover-image";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<TripStatus, string> = {
  upcoming: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
};

const STATUS_ICON: Record<TripStatus, LucideIcon> = {
  upcoming: Clock,
  active: PlaneTakeoff,
  completed: CircleCheck,
};

// `spent` is the trip's total converted_amount across all expenses (summed
// by the caller — see app/trips/page.tsx).
export async function TripCard({
  trip,
  spent = 0,
  isOwner = true,
}: {
  trip: Trip;
  spent?: number;
  isOwner?: boolean;
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const bcp47 = LOCALE_BCP47[locale];
  const status = calculateTripStatus(trip.start_date, trip.end_date);
  const remaining = calculateRemainingBudget(trip.total_budget, spent);
  const progress = trip.total_budget > 0 ? (spent / trip.total_budget) * 100 : 0;
  const StatusIcon = STATUS_ICON[status];
  const statusLabel: Record<TripStatus, string> = {
    upcoming: dict.trips.statusUpcoming,
    active: dict.trips.statusActive,
    completed: dict.trips.statusCompleted,
  };

  return (
    <div className="border-border bg-card overflow-hidden rounded-3xl border shadow-sm">
      <Link href={`/trip/${trip.id}/dashboard`} className="block">
        {/* The stored cover only — rendering a card never searches for photos. */}
        <div className="relative h-40 sm:h-44">
          <TripCoverImage
            src={trip.cover_image_url}
            alt=""
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
          />
          <span
            className={cn(
              "absolute end-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              STATUS_CLASS[status],
            )}
          >
            <StatusIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {statusLabel[status]}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h2 className="truncate text-lg font-semibold">{trip.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/90">
              <Calendar aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {formatDateRange(trip.start_date, trip.end_date, bcp47)}
            </p>
          </div>
        </div>

        <div className="px-5 pt-4 pb-5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatDestination(trip.destination, bcp47)}</span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-card-foreground flex items-center gap-1.5">
                <Wallet
                  aria-hidden
                  className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                />
                {formatCurrency(spent, trip.base_currency, bcp47)} {dict.trips.spent}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(trip.total_budget, trip.base_currency, bcp47)}{" "}
                {dict.trips.budget}
              </span>
            </div>
            <ProgressBar value={progress} className="mt-2" />
            <p className="text-muted-foreground mt-1.5 text-xs">
              {formatCurrency(remaining, trip.base_currency, bcp47)}{" "}
              {dict.trips.remaining}
            </p>
          </div>
        </div>
      </Link>

      {isOwner && (
        <div className="border-border mx-5 mb-3 flex gap-2 border-t pt-3">
          <Link
            href={`/trips/${trip.id}/edit`}
            className="text-muted-foreground flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-opacity active:opacity-60"
          >
            <Pencil className="h-4 w-4" />
            {dict.common.edit}
          </Link>
          <DeleteTripButton tripId={trip.id} tripName={trip.name} />
        </div>
      )}
    </div>
  );
}
