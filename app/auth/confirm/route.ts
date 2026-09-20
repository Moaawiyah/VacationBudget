import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { getSdk } from "@/lib/sdk/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * The link in Supabase's "Confirm signup" email points here. This exchanges
 * the one-time token for a real session, then redirects into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // `next` is attacker-controllable via the URL, so only a same-origin app
  // path may be used as the redirect target (no //host, no absolute URLs).
  const next = safeRedirectPath(searchParams.get("next"));

  if (token_hash && type) {
    const sdk = await getSdk();
    if (await sdk.auth.verifyEmail(type, token_hash)) {
      redirect(next);
    }
  }

  redirect("/login?error=confirmation-failed");
}
