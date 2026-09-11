"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/sdk/server";
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

  const { sdk, user } = await requireUser();

  // RLS enforces trip ownership too — this check just gives a clean error
  // instead of a silent no-op if someone tries to plan for a trip that
  // isn't theirs (or doesn't exist).
  if (!(await sdk.trips.isOwnedBy(user.id, tripId))) {
    return { error: dict.trips.tripNotFound };
  }

  const result = await sdk.plannedBudgets.upsert(tripId, categoryId, parsed.data);
  if (result.error) return result;

  revalidatePath(`/trip/${tripId}/plan`);
  revalidatePath(`/trip/${tripId}/dashboard`);
  return {};
}
