"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createTrip } from "@/app/trips/actions";
import { TripForm } from "@/components/trips/trip-form";

export default function NewTripPage() {
  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-foreground text-xl font-semibold">New trip</h1>
      </div>
      <TripForm onSubmit={createTrip} submitLabel="Create trip" />
    </main>
  );
}
