import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Trip } from "@/types/trip";
import { formatDateRange } from "@/lib/format-date";
import { formatDestination } from "@/lib/countries";
import { calculateTripStatus } from "@/lib/calculations/trip";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";

export async function TripHero({
  trip,
  showLink = true,
}: {
  trip: Trip;
  showLink?: boolean;
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const bcp47 = LOCALE_BCP47[locale];
  const status = calculateTripStatus(trip.start_date, trip.end_date);
  const label = {
    active: dict.trips.statusActive,
    upcoming: dict.trips.statusUpcoming,
    completed: dict.trips.statusCompleted,
  }[status];
  return (
    <section className="travel-cover relative flex min-h-44 flex-col justify-end overflow-hidden rounded-2xl p-4 text-white sm:min-h-72 sm:p-7">
      <span className="absolute start-4 top-3 rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs backdrop-blur-md sm:start-7 sm:top-5">
        {label}
      </span>
      <h2 className="mt-8 text-xl font-semibold tracking-tight sm:text-3xl">
        {trip.name}
      </h2>
      <p className="mt-2 flex items-center gap-2 text-sm">
        <MapPin aria-hidden className="size-4 shrink-0" />
        {formatDestination(trip.destination, bcp47)}
      </p>
      <p className="mt-2 flex items-center gap-2 text-xs text-white/90">
        <CalendarDays aria-hidden className="size-4 shrink-0" />
        {formatDateRange(trip.start_date, trip.end_date, bcp47)}
      </p>
      {showLink && (
        <Link
          href={`/trip/${trip.id}/details`}
          className="mt-5 flex w-fit items-center gap-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900"
        >
          {dict.travel.viewTrip}
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      )}
    </section>
  );
}
