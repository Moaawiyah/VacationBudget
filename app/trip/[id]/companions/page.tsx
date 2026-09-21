import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { CompanionManager } from "@/components/trips/companion-manager";

export default async function CompanionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const result = await sdk.companions.listForTrip(user.id, id);
  if ("error" in result) notFound();
  return (
    <main className="safe-x mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex items-center gap-3">
        <Users aria-hidden className="text-primary size-6" />
        <h1 className="text-2xl font-semibold">{dict.travel.companions}</h1>
      </header>
      <CompanionManager
        tripId={id}
        initial={result.companions}
        isOwner={result.isOwner}
      />
    </main>
  );
}
