"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/sdk/server";

export async function respondToInvitation(tripId: string, accept: boolean) {
  const { sdk, user } = await requireUser();
  const result = await sdk.companions.respond(user.id, tripId, accept);
  if (result.error) return result;
  revalidatePath("/invitations");
  revalidatePath("/trips");
  revalidatePath(`/trip/${tripId}`);
  return {};
}
