import { notFound } from "next/navigation";
import { getTrip } from "@/lib/data/trips";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateRange } from "@/lib/format-date";

// Placeholder — full budget/spend calculations and charts land in Phase 4.
// Header + back link now live in the shared trip/[id]/layout.tsx.
export default async function TripDashboardPage({
  params,
}: PageProps<"/trip/[id]/dashboard">) {
  const { id } = await params;
  const trip = await getTrip(id);

  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <div className="border-border bg-card rounded-3xl border p-6">
        <p className="text-muted-foreground text-sm">
          {formatDateRange(trip.start_date, trip.end_date)}
        </p>
        <p className="text-card-foreground mt-3 text-2xl font-semibold">
          {formatCurrency(trip.total_budget, trip.base_currency)}
        </p>
        <p className="text-muted-foreground text-sm">Total budget</p>
      </div>

      <div className="border-border bg-card text-muted-foreground rounded-3xl border p-6 text-sm">
        Full dashboard — spending breakdown, remaining budget, safe daily spend, and
        charts — arrives in Phase 4.
      </div>
    </main>
  );
}
