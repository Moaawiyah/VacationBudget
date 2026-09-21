import { Sidebar } from "@/components/navigation/sidebar";
import { TripHeader } from "@/components/navigation/trip-header";
import { notFound } from "next/navigation";
import { getSdk } from "@/lib/sdk/server";
import { getLocale } from "@/lib/i18n/server";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { formatDestination } from "@/lib/countries";

// Shared chrome for every /trip/[id]/* page: header (trip name + back link)
// and the bottom nav. The SDK is built once per request and caches reads, so
// this and the page below it share one trip query instead of two.
export default async function TripLayout({
  children,
  params,
}: LayoutProps<"/trip/[id]">) {
  const { id } = await params;
  const sdk = await getSdk();
  const [trip, locale] = await Promise.all([sdk.trips.get(id), getLocale()]);
  if (!trip) notFound();

  return (
    <div className="flex flex-1 flex-col lg:ps-60">
      <Sidebar tripId={id} />
      <TripHeader
        tripId={trip.id}
        name={trip.name}
        destination={formatDestination(trip.destination, LOCALE_BCP47[locale])}
      />
      <div className="trip-content flex min-w-0 flex-1 flex-col pb-24 lg:pb-8">
        {children}
      </div>
      <BottomNav tripId={trip.id} />
    </div>
  );
}
