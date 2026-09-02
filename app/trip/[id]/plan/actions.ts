"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const amountSchema = z.coerce.number().min(0, "Amount can't be negative");

export async function upsertPlannedBudget(
  tripId: string,
  categoryId: string,
  amount: unknown,
): Promise<{ error?: string }> {
  const parsed = amountSchema.safeParse(amount);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid amount." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // RLS enforces trip ownership too — this check just gives a clean error
  // instead of a silent no-op if someone tries to plan for a trip that
  // isn't theirs (or doesn't exist).
  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();
  if (!trip) return { error: "Trip not found." };

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
