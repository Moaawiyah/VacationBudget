import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/types/category";

/** System categories (user_id null) plus the current user's own custom ones. */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return data ?? [];
});
