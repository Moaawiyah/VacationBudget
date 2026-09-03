import Link from "next/link";
import { Plus, Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { toTrip } from "@/types/trip";
import { TripCard } from "@/components/trips/trip-card";
import { LogoutButton } from "@/components/navigation/logout-button";

export default async function TripsPage() {
  const [supabase, dict] = await Promise.all([createClient(), getDictionary()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user!.id)
    .order("start_date", { ascending: true });

  const trips = (rows ?? []).map(toTrip);

  // One extra query for every trip's total spend, instead of one query per
  // card (which would be an N+1 query as the trip list grows).
  const tripIds = trips.map((trip) => trip.id);
  const { data: expenseRows } =
    tripIds.length > 0
      ? await supabase
          .from("expenses")
          .select("trip_id, converted_amount")
          .in("trip_id", tripIds)
      : { data: [] };

  const spentByTrip = new Map<string, number>();
  for (const row of expenseRows ?? []) {
    spentByTrip.set(
      row.trip_id,
      (spentByTrip.get(row.trip_id) ?? 0) + Number(row.converted_amount),
    );
  }

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">{dict.trips.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{user?.email}</p>
        </div>
        <LogoutButton />
      </div>

      <Link href="/trips/new">
        <button className="bg-primary text-primary-foreground flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-medium active:opacity-80">
          <Plus className="h-5 w-5" />
          {dict.trips.newTrip}
        </button>
      </Link>

      {trips.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-2xl">
            <Plane className="text-muted-foreground h-6 w-6" />
          </div>
          <p className="text-muted-foreground text-sm">
            {dict.trips.noTripsTitle}
            <br />
            {dict.trips.noTripsSubtitle}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} spent={spentByTrip.get(trip.id) ?? 0} />
          ))}
        </div>
      )}
    </main>
  );
}
