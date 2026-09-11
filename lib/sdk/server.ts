import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VacationBudgetSDK } from "./sdk";

/**
 * The SDK for the current request. React's cache() builds it once per
 * request, so a layout and its page share one SDK (and its read cache).
 */
export const getSdk = cache(
  async () => new VacationBudgetSDK(await createClient(), createAdminClient()),
);

/** The signed-in user plus the SDK — or a redirect to /login if signed out. */
export async function requireUser() {
  const sdk = await getSdk();
  const user = await sdk.auth.getUser();
  if (!user) redirect("/login");
  return { sdk, user };
}
