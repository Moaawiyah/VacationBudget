import Link from "next/link";
import { getTrip } from "@/lib/data/trips";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/settings/language-switcher";

// Placeholder — full trip/account settings arrive in Phase 17.
export default async function TripSettingsPage({
  params,
}: PageProps<"/trip/[id]/settings">) {
  const { id } = await params;
  const [trip, dict] = await Promise.all([getTrip(id), getDictionary()]);
  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground text-xl font-semibold">{dict.settings.title}</h1>
      <LanguageSwitcher />
      <div className="border-border bg-card text-muted-foreground rounded-3xl border p-6 text-sm">
        {dict.settings.placeholderBody}
      </div>
      <Link href={`/trips/${trip.id}/edit`}>
        <Button variant="secondary">{dict.settings.editTripDetails}</Button>
      </Link>
    </main>
  );
}
