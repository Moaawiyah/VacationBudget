"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { appErrorMessage } from "@/lib/i18n/app-error";

export async function respondToInvitation(tripId: string, accept: boolean) {
  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const result = await sdk.companions.respond(user.id, tripId, accept);
  if (result.error) return { error: appErrorMessage(result.code, dict.errors) };
  revalidatePath("/invitations");
  revalidatePath("/trips");
  revalidatePath(`/trip/${tripId}`);
  return {};
}
