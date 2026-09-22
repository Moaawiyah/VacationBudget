"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { appErrorMessage } from "@/lib/i18n/app-error";

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

  // Planning is owner-only (RLS enforces it too — 0009). Checking first turns
  // a member's attempt into a clear message rather than a policy violation.
  if (!(await sdk.trips.isOwnedBy(user.id, tripId))) {
    const visible = await sdk.trips.accessibleBaseCurrency(tripId);
    return { error: visible ? dict.errors.planOwnerOnly : dict.trips.tripNotFound };
  }

  const result = await sdk.plannedBudgets.upsert(tripId, categoryId, parsed.data);
  if (result.error) return { error: appErrorMessage(result.code, dict.errors) };

  revalidatePath(`/trip/${tripId}/plan`);
  revalidatePath(`/trip/${tripId}/dashboard`);
  return {};
}
