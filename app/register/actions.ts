"use server";

import { getSdk } from "@/lib/sdk/server";
import { getURL } from "@/lib/get-url";
import { getDictionary } from "@/lib/i18n/server";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

// Each registration triggers a Supabase account + confirmation email, so
// cap creations per client IP to blunt automated sign-up abuse.
const REGISTRATIONS = 5;
const WINDOW_MS = 60 * 60 * 1000;

type RegisterResult = { error: string } | { emailTaken: true } | { success: true };

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const dict = await getDictionary();
  const parsed = registerSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.genericInvalid };
  }

  const ip = await getClientIp();
  if (!rateLimit(`register-ip:${ip}`, REGISTRATIONS, WINDOW_MS).allowed) {
    return { error: dict.validation.tooManyAttempts };
  }

  // AuthService.register checks for an existing account first, so a taken
  // email gets a clear message and no confirmation mail is sent.
  const sdk = await getSdk();
  const result = await sdk.auth.register(
    parsed.data.email,
    parsed.data.password,
    `${getURL()}auth/confirm`,
  );

  if (result.status === "email_taken") return { emailTaken: true };
  if (result.status === "error") return { error: result.error };
  return { success: true };
}
