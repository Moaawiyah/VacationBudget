import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { EditTripForm } from "@/components/trips/edit-trip-form";

export default async function EditTripPage({ params }: PageProps<"/trips/[id]/edit">) {
  const { id } = await params;
  const sdk = await getSdk();
  const [trip, dict] = await Promise.all([sdk.trips.get(id), getDictionary()]);

  if (!trip) notFound();
  const user = await sdk.auth.getUser();
  if (!user || !(await sdk.trips.isOwnedBy(user.id, id))) notFound();

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/trip/${id}/details`}
          aria-label={dict.common.back}
          className="text-primary flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeft aria-hidden className="h-5 w-5 rtl:-scale-x-100" />
          {dict.common.back}
        </Link>
        <h1 className="text-foreground text-xl font-semibold">
          {dict.tripForm.editTripTitle}
        </h1>
      </div>
      <EditTripForm trip={trip} />
    </main>
  );
}
