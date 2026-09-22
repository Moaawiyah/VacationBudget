import { notFound } from "next/navigation";
import { Scale } from "lucide-react";
import { getSdk, requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { applySettlements, calculateBalances } from "@/lib/finance/balances";
import { suggestSettlements } from "@/lib/finance/settlement";
import { BalancesView } from "@/components/balances/balances-view";

export default async function BalancesPage({
  params,
}: PageProps<"/trip/[id]/balances">) {
  const { id } = await params;
  const sdk = await getSdk();
  const { user } = await requireUser();
  const [trip, dict, companionResult, expenses, settlements] = await Promise.all([
    sdk.trips.get(id),
    getDictionary(),
    sdk.companions.listForTrip(user.id, id),
    sdk.expenses.listWithSplitsForTrip(id),
    sdk.settlements.listForTrip(id),
  ]);
  if (!trip || "error" in companionResult) notFound();

  const rawBalances = calculateBalances(trip.base_currency, expenses);
  const balances = applySettlements(
    trip.base_currency,
    rawBalances,
    settlements.map((s) => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount })),
  );
  const suggestions = suggestSettlements(trip.base_currency, balances);

  return (
    <main className="safe-x mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex items-center gap-3">
        <Scale aria-hidden className="text-primary size-6" />
        <h1 className="text-2xl font-semibold">{dict.balances.title}</h1>
      </header>
      <BalancesView
        tripId={id}
        currentUserId={user.id}
        isOwner={companionResult.isOwner}
        companions={companionResult.companions}
        baseCurrency={trip.base_currency}
        balances={balances}
        suggestions={suggestions}
        settlements={settlements}
      />
    </main>
  );
}
