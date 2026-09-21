import Link from "next/link";
import { Plus, Plane, Settings, Mail } from "lucide-react";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { TripCard } from "@/components/trips/trip-card";
import { LogoutButton } from "@/components/navigation/logout-button";

export default async function TripsPage() {
  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const [trips, invitations] = await Promise.all([
    sdk.trips.listWithSpent(user.id),
    sdk.companions.invitations(user.id),
  ]);

  return (
    <main className="safe-top safe-x safe-bottom mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6 sm:p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">{dict.trips.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/invitations"
            aria-label={dict.travel.invitations}
            className="text-muted-foreground relative flex h-9 w-9 items-center justify-center rounded-xl"
          >
            <Mail aria-hidden className="h-5 w-5" />
            {invitations.length > 0 && (
              <span className="bg-danger text-danger-foreground absolute -end-1 -top-1 grid size-5 place-items-center rounded-full text-[10px] font-bold">
                {invitations.length}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            aria-label={dict.nav.settings}
            className="text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl active:opacity-60"
          >
            <Settings aria-hidden className="h-5 w-5" />
          </Link>
          <LogoutButton />
        </div>
      </div>

      <Link
        href="/trips/new"
        className="bg-primary text-primary-foreground flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-medium active:opacity-80"
      >
        <Plus className="h-5 w-5" />
        {dict.trips.newTrip}
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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {trips.map(({ trip, spent, isOwner }) => (
            <TripCard key={trip.id} trip={trip} spent={spent} isOwner={isOwner} />
          ))}
        </div>
      )}
    </main>
  );
}
