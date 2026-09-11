import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { toTrip } from "@/types/trip";
import { EditTripForm } from "@/components/trips/edit-trip-form";

export default async function EditTripPage({ params }: PageProps<"/trips/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const dict = await getDictionary();

  const { data: row } = await supabase.from("trips").select("*").eq("id", id).single();

  if (!row) notFound();

  const trip = toTrip(row);

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/trips"
          aria-label={dict.common.back}
          className="text-muted-foreground"
        >
          <ArrowLeft aria-hidden className="h-5 w-5 rtl:-scale-x-100" />
        </Link>
        <h1 className="text-foreground text-xl font-semibold">
          {dict.tripForm.editTripTitle}
        </h1>
      </div>
      <EditTripForm trip={trip} />
    </main>
  );
}
