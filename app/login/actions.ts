"use server";

import { redirect } from "next/navigation";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export async function login(input: LoginInput): Promise<{ error: string } | never> {
  const dict = await getDictionary();
  const parsed = loginSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: dict.validation.loginInvalid };
  }

  const sdk = await getSdk();
  const { error } = await sdk.auth.signIn(parsed.data.email, parsed.data.password);
  if (error) {
    return { error };
  }

  redirect("/trips");
}
