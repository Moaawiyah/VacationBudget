import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toTrip } from "@/types/trip";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateRange } from "@/lib/format-date";

// Placeholder — full budget/spend calculations and charts land in Phase 4.
export default async function TripDashboardPage({
  params,
}: PageProps<"/trip/[id]/dashboard">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase.from("trips").select("*").eq("id", id).single();

  if (!row) notFound();

  const trip = toTrip(row);

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-foreground text-xl font-semibold">{trip.name}</h1>
          <p className="text-muted-foreground text-sm">{trip.destination}</p>
        </div>
      </div>

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
