"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export async function login(input: LoginInput): Promise<{ error: string } | never> {
  const dict = await getDictionary();
  const parsed = loginSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: dict.validation.loginInvalid };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/trips");
}
