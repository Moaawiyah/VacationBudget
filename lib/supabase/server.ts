import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Must be created fresh per request (it closes over that request's cookies).
 *
 * The try/catch around cookies.set is intentional: Server Components can
 * only *read* cookies, not write them — writes only succeed from a Server
 * Action or Route Handler. Middleware (see middleware.ts) is what actually
 * refreshes the session cookie on GET requests to Server Components, so this
 * failing silently there is safe and expected.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore, see comment above.
          }
        },
      },
    },
  );
}
