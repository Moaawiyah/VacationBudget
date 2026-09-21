import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Trip } from "@/types/trip";
import type { Dictionary } from "@/lib/i18n/types";
import { getDestinationParts } from "@/lib/countries";
import { formatCurrency } from "@/lib/currency/format";

export function TripDetailsOverview({
  trip,
  spent,
  dict,
  bcp47,
}: {
  trip: Trip;
  spent: number;
  dict: Dictionary;
  bcp47: string;
}) {
  const destinations = getDestinationParts(trip.destination, bcp47);
  const money = (amount: number) => formatCurrency(amount, trip.base_currency, bcp47);
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <section aria-labelledby="destinations-title">
        <h2 id="destinations-title" className="font-semibold">
          {dict.travel.destinations}
        </h2>
        {destinations.length ? (
          <ol className="mt-4 space-y-3">
            {destinations.map((destination, index) => (
              <li
                key={destination.code ?? destination.name}
                className="border-border bg-background flex items-center gap-4 rounded-2xl border p-4"
              >
                <span
                  aria-hidden
                  className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                >
                  {destination.flag ?? <MapPin className="text-primary size-5" />}
                </span>
                <span className="flex-1 font-medium">{destination.name}</span>
                <span aria-hidden className="text-muted-foreground text-xs">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Link
            href={`/trips/${trip.id}/edit`}
            className="text-primary mt-4 inline-block text-sm"
          >
            {dict.tripForm.destinationPlaceholder}
          </Link>
        )}
      </section>
      <section
        aria-labelledby="trip-budget-title"
        className="bg-background rounded-2xl p-5"
      >
        <h2 id="trip-budget-title" className="font-semibold">
          {dict.tripForm.totalBudget}
        </h2>
        <p className="mt-3 text-3xl font-semibold">{money(trip.total_budget)}</p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{dict.dashboard.spent}</dt>
            <dd>{money(spent)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{dict.dashboard.remaining}</dt>
            <dd className={spent > trip.total_budget ? "text-danger" : "text-primary"}>
              {money(trip.total_budget - spent)}
            </dd>
          </div>
          <div className="border-border flex justify-between gap-3 border-t pt-3">
            <dt className="text-muted-foreground">{dict.tripForm.currency}</dt>
            <dd>{trip.base_currency}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
