import { notFound } from "next/navigation";
import { getSdk, requireUser } from "@/lib/sdk/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { TripDetailsView } from "@/components/trips/trip-details-view";

export default async function TripDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sdk = await getSdk();
  const [{ user }, trip, expenses, dict, locale] = await Promise.all([
    requireUser(),
    sdk.trips.get(id),
    sdk.expenses.listForTrip(id),
    getDictionary(),
    getLocale(),
  ]);
  if (!trip) notFound();
  const companionResult = await sdk.companions.listForTrip(user.id, id);
  if ("error" in companionResult) notFound();
  return (
    <TripDetailsView
      trip={trip}
      expenses={expenses}
      dict={dict}
      bcp47={LOCALE_BCP47[locale]}
      companions={companionResult.companions}
      isOwner={companionResult.isOwner}
      currentUserId={user.id}
    />
  );
}
