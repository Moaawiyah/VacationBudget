import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets, Next internals, and the
    // PWA manifest/icon routes — those are fetched unauthenticated by the
    // browser/OS (install checks, home-screen icon), so they must never
    // redirect to /login. "icon" and "apple-icon" are unanchored on purpose:
    // that one prefix also covers /icon-192 and /icon-512 (see app/icon-192,
    // app/icon-512), not just the exact /icon and /apple-icon routes.
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
