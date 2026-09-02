import Link from "next/link";
import { getTrip } from "@/lib/data/trips";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";

// Placeholder — full trip/account settings arrive in Phase 17.
export default async function TripSettingsPage({
  params,
}: PageProps<"/trip/[id]/settings">) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground text-xl font-semibold">Settings</h1>
      <div className="border-border bg-card text-muted-foreground rounded-3xl border p-6 text-sm">
        Currency, budget, and category settings arrive in Phase 17. For now, edit the
        trip&apos;s core details below.
      </div>
      <Link href={`/trips/${trip.id}/edit`}>
        <Button variant="secondary">Edit trip details</Button>
      </Link>
    </main>
  );
}
