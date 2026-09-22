"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/sdk/server";

/**
 * Tombstones the account (AccountService.deleteAccount) rather than
 * hard-deleting it — see that method's own comment. Refuses, with the
 * blocking trip names, if any owned trip still has other people on it.
 */
export async function deleteMyAccount(): Promise<{ error: string; trips?: string[] } | never> {
  const { sdk, user } = await requireUser();
  const result = await sdk.account.deleteAccount(user.id);
  if (result.error) return { error: result.error, trips: result.blockedBy };
  redirect("/login");
}
