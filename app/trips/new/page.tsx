"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createTrip } from "@/app/trips/actions";
import { TripForm } from "@/components/trips/trip-form";
import { useDictionary } from "@/components/i18n/locale-provider";

export default function NewTripPage() {
  const dict = useDictionary();
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
          {dict.tripForm.newTripTitle}
        </h1>
      </div>
      <TripForm onSubmit={createTrip} submitLabel={dict.tripForm.createTrip} />
    </main>
  );
}
