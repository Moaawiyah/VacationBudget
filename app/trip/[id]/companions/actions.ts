"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";

export async function inviteCompanion(tripId: string, username: string) {
  const dict = await getDictionary();
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.-]{3,30}$/)
    .safeParse(username);
  if (!parsed.success) return { error: dict.validation.usernameInvalid };
  const { sdk, user } = await requireUser();
  const result = await sdk.companions.invite(user.id, tripId, parsed.data);
  if (result.code === "user_not_found") return { error: dict.travel.userNotFound };
  if (result.code === "already_invited") return { error: dict.travel.alreadyInvited };
  if (result.code === "self") return { error: dict.travel.cannotInviteSelf };
  if (result.error) return { error: result.error };
  revalidatePath(`/trip/${tripId}/companions`);
  revalidatePath("/invitations");
  return { success: true };
}

export async function removeCompanion(tripId: string, userId: string) {
  const { sdk, user } = await requireUser();
  const result = await sdk.companions.remove(user.id, tripId, userId);
  if (!result.error) revalidatePath(`/trip/${tripId}`);
  return result;
}
