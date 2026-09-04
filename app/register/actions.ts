"use server";

import { createClient } from "@/lib/supabase/server";
import { getURL } from "@/lib/get-url";
import { getDictionary } from "@/lib/i18n/server";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

type RegisterResult = { error: string } | { success: true };

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const dict = await getDictionary();
  const parsed = registerSchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.genericInvalid };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getURL()}auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
