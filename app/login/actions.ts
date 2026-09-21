"use server";

import { redirect } from "next/navigation";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

// Brute-force / credential-stuffing guard on top of Supabase's own
// platform-side limits: per IP (shared networks) and per identifier (targeted).
const ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function login(input: LoginInput): Promise<{ error: string } | never> {
  const dict = await getDictionary();
  const parsed = loginSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: dict.validation.loginInvalid };
  }

  const ip = await getClientIp();
  const identifier = parsed.data.identifier.toLowerCase();
  const limited =
    !rateLimit(`login-ip:${ip}`, ATTEMPTS, WINDOW_MS).allowed ||
    !rateLimit(`login-identifier:${identifier}`, ATTEMPTS, WINDOW_MS).allowed;
  if (limited) return { error: dict.validation.tooManyAttempts };

  const sdk = await getSdk();
  const { error } = await sdk.auth.signIn(identifier, parsed.data.password);
  if (error) {
    return { error: dict.validation.loginInvalid };
  }

  redirect("/trips");
}
