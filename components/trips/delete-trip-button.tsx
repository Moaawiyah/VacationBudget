"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTrip } from "@/app/trips/actions";

export function DeleteTripButton({
  tripId,
  tripName,
}: {
  tripId: string;
  tripName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${tripName}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteTrip(tripId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-danger flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-opacity active:opacity-60 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
