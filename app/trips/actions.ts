"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { tripSchema, type TripInput } from "@/lib/validation/trip";

type ActionResult = { error: string } | never;

export async function createTrip(input: TripInput): Promise<ActionResult> {
  const dict = await getDictionary();
  const parsed = tripSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.tripInvalid };
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("trips")
    .insert({
      // user_id always comes from the authenticated session, never from the
      // form — the client can't be trusted to say who it is.
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      destination: parsed.data.destination,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      base_currency: parsed.data.base_currency,
      total_budget: parsed.data.total_budget,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/trips");
  redirect(`/trip/${data.id}/dashboard`);
}

export async function updateTrip(
  tripId: string,
  input: TripInput,
): Promise<ActionResult> {
  const dict = await getDictionary();
  const parsed = tripSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.tripInvalid };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("trips")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      destination: parsed.data.destination,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      base_currency: parsed.data.base_currency,
      total_budget: parsed.data.total_budget,
    })
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/trips");
  revalidatePath(`/trip/${tripId}/dashboard`);
  redirect("/trips");
}

export async function deleteTrip(tripId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/trips");
  return {};
}
