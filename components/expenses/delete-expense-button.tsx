"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/trip/[id]/expenses/actions";

export function DeleteExpenseButton({
  tripId,
  expenseId,
}: {
  tripId: string;
  expenseId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this expense? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deleteExpense(tripId, expenseId);
      if (!result.error) {
        router.push(`/trip/${tripId}/expenses`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="border-danger/30 text-danger flex h-12 w-full items-center justify-center gap-2 rounded-2xl border text-base font-medium disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "Deleting…" : "Delete expense"}
    </button>
  );
}
