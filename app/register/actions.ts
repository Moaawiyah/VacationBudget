"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getURL } from "@/lib/get-url";
import { getDictionary } from "@/lib/i18n/server";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

type RegisterResult = { error: string } | { emailTaken: true } | { success: true };

// Every auth user — confirmed or not — has a profiles row (created by the
// on_auth_user_created trigger in 0001_profiles.sql), so it doubles as an
// "is this email registered?" lookup. Needs the service-role key because RLS
// only lets users read their own row; without the key this returns false and
// register() falls back to signUp's own signals.
async function isEmailRegistered(email: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .limit(1);

  return !error && data.length > 0;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const dict = await getDictionary();
  const parsed = registerSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.genericInvalid };
  }

  // Supabase's signUp never errors on a taken email (it hides that to prevent
  // account enumeration) and, for an unconfirmed account, silently re-sends
  // the confirmation mail. Check first so a taken email gets a clear message
  // and no email goes out.
  if (await isEmailRegistered(parsed.data.email)) {
    return { emailTaken: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getURL()}auth/confirm`,
    },
  });

  if (error) {
    // What Supabase returns instead when email confirmation is turned off.
    if (error.code === "user_already_exists") return { emailTaken: true };
    return { error: error.message };
  }

  // Fallback for when the pre-check couldn't run: an existing, confirmed
  // account comes back as an obfuscated user with no identities.
  if (data.user && data.user.identities?.length === 0) {
    return { emailTaken: true };
  }

  return { success: true };
}
