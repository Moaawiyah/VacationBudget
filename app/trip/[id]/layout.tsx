import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTrip } from "@/lib/data/trips";
import { BottomNav } from "@/components/navigation/bottom-nav";

// Shared chrome for every /trip/[id]/* page: header (trip name + back link)
// and the bottom nav. getTrip() is React-cached, so this and the page below
// it share one database query per request instead of two.
export default async function TripLayout({
  children,
  params,
}: LayoutProps<"/trip/[id]">) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-top safe-x border-border bg-background sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3">
        <Link href="/trips" className="text-muted-foreground shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-foreground truncate font-semibold">{trip.name}</p>
          <p className="text-muted-foreground truncate text-xs">{trip.destination}</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      <BottomNav tripId={trip.id} />
    </div>
  );
}
