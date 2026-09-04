"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

export async function upsertPlannedBudget(
  tripId: string,
  categoryId: string,
  amount: unknown,
): Promise<{ error?: string }> {
  const dict = await getDictionary();
  const amountSchema = z.coerce.number().min(0, dict.validation.amountNegative);
  const parsed = amountSchema.safeParse(amount);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.amountInvalid };
  }

  const { supabase, user } = await requireUser();

  // RLS enforces trip ownership too — this check just gives a clean error
  // instead of a silent no-op if someone tries to plan for a trip that
  // isn't theirs (or doesn't exist).
  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();
  if (!trip) return { error: dict.trips.tripNotFound };

  const { error } = await supabase
    .from("planned_budgets")
    .upsert(
      { trip_id: tripId, category_id: categoryId, planned_amount: parsed.data },
      { onConflict: "trip_id,category_id" },
    );

  if (error) return { error: error.message };

  revalidatePath(`/trip/${tripId}/plan`);
  revalidatePath(`/trip/${tripId}/dashboard`);
  return {};
}
