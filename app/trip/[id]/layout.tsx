import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";
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
  const [trip, locale, dict] = await Promise.all([
    sdk.trips.get(id),
    getLocale(),
    getDictionary(),
  ]);
  if (!trip) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-top safe-x border-border bg-background sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/trips"
          aria-label={dict.common.back}
          className="text-muted-foreground shrink-0"
        >
          <ArrowLeft aria-hidden className="h-5 w-5 rtl:-scale-x-100" />
        </Link>
        <div className="min-w-0">
          <p className="text-foreground truncate font-semibold">{trip.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {formatDestination(trip.destination, LOCALE_BCP47[locale])}
          </p>
        </div>
      </header>
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      <BottomNav tripId={trip.id} />
    </div>
  );
}
