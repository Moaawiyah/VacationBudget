import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client: bypasses Row Level Security. Server-only —
 * import it only from Server Actions and Route Handlers, never from a Client
 * Component, and never give the key a NEXT_PUBLIC_ prefix.
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY isn't configured, so callers
 * can fall back to a degraded path instead of crashing.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
