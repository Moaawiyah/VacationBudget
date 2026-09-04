import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Every server action needs this: get the signed-in user or bounce to /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}
