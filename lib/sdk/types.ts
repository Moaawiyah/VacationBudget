import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** The Supabase client every service receives through its constructor. */
export type DbClient = SupabaseClient<Database>;

/** Outcome of a write: `{}` on success, `{ error }` with a message on failure. */
export type WriteResult = { error?: string };
