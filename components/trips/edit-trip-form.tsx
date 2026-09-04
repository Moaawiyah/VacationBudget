"use client";

import { updateTrip } from "@/app/trips/actions";
import { TripForm, type TripFormValues } from "@/components/trips/trip-form";
import { useDictionary } from "@/components/i18n/locale-provider";
import type { Trip } from "@/types/trip";

export function EditTripForm({ trip }: { trip: Trip }) {
  const dict = useDictionary();
  const defaultValues: Partial<TripFormValues> = {
    name: trip.name,
    description: trip.description ?? "",
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    base_currency: trip.base_currency,
    total_budget: trip.total_budget,
  };

  return (
    <TripForm
      defaultValues={defaultValues}
      onSubmit={(data) => updateTrip(trip.id, data)}
      submitLabel={dict.tripForm.saveChanges}
    />
  );
}
