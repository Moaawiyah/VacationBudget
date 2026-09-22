"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { appErrorMessage } from "@/lib/i18n/app-error";
import { tripSchema, type TripInput } from "@/lib/validation/trip";

type ActionResult = { error: string } | never;

/** Validates trip input against the current locale's messages. */
async function validateTrip(
  input: TripInput,
): Promise<{ data: TripInput } | { error: string }> {
  const dict = await getDictionary();
  const parsed = tripSchema(dict.validation).safeParse(input);
  if (parsed.success) return { data: parsed.data };
  return { error: parsed.error.issues[0]?.message ?? dict.validation.tripInvalid };
}

export async function createTrip(input: TripInput): Promise<ActionResult> {
  const validated = await validateTrip(input);
  if ("error" in validated) return validated;

  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const result = await sdk.trips.create(user.id, validated.data);
  if ("error" in result) return { error: appErrorMessage(result.code, dict.errors) };

  revalidatePath("/trips");
  redirect(`/trip/${result.id}/dashboard`);
}

export async function updateTrip(
  tripId: string,
  input: TripInput,
): Promise<ActionResult> {
  const validated = await validateTrip(input);
  if ("error" in validated) return validated;

  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const result = await sdk.trips.update(user.id, tripId, validated.data);
  if (result.error) return { error: appErrorMessage(result.code, dict.errors) };

  revalidatePath("/trips");
  revalidatePath(`/trip/${tripId}/dashboard`);
  redirect("/trips");
}

export async function deleteTrip(tripId: string): Promise<{ error?: string }> {
  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const result = await sdk.trips.delete(user.id, tripId);
  if (result.error) return { error: appErrorMessage(result.code, dict.errors) };

  revalidatePath("/trips");
  return {};
}
