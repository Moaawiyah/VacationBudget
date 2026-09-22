import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AppErrorCode } from "./errors";

/** The Supabase client every service receives through its constructor. */
export type DbClient = SupabaseClient<Database>;

/**
 * Outcome of a write: `{}` on success; on failure a safe message plus a code
 * the Server Actions translate. `error` never carries a raw database message.
 */
export type WriteResult = { error?: string; code?: AppErrorCode };
