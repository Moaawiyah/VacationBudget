import Link from "next/link";
import { Info, Pencil, Settings } from "lucide-react";
import { notFound } from "next/navigation";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/settings/language-switcher";

// Placeholder — full trip/account settings arrive in Phase 17.
export default async function TripSettingsPage({
  params,
}: PageProps<"/trip/[id]/settings">) {
  const { id } = await params;
  const sdk = await getSdk();
  const [trip, dict] = await Promise.all([sdk.trips.get(id), getDictionary()]);
  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
        <Settings aria-hidden className="text-primary h-5 w-5 shrink-0" />
        {dict.settings.title}
      </h1>
      <LanguageSwitcher />
      <div className="border-border bg-card text-muted-foreground flex gap-3 rounded-3xl border p-6 text-sm">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{dict.settings.placeholderBody}</p>
      </div>
      <Link href={`/trips/${trip.id}/edit`}>
        <Button variant="secondary" className="gap-2">
          <Pencil aria-hidden className="h-4 w-4 shrink-0" />
          {dict.settings.editTripDetails}
        </Button>
      </Link>
    </main>
  );
}
