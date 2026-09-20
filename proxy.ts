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
    // redirect to /login. The icon alternatives are anchored ($): "icon"
    // alone would also exempt unrelated paths that merely *start* with
    // "icon" (e.g. /iconography) from session refresh and auth redirects.
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|icon(?:-192|-512)?$|apple-icon$|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
