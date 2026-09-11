import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { AuthService } from "@/lib/sdk/auth-service";

const PUBLIC_PATHS = ["/login", "/register", "/auth"];

/**
 * Runs on every request (see proxy.ts at the project root).
 * Two jobs:
 *  1. Refresh the Supabase session cookie so it doesn't expire mid-session.
 *  2. Redirect signed-out users away from protected pages, and signed-in
 *     users away from /login and /register.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const user = await new AuthService(supabase).getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublicPath && path !== "/") {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/trips", request.url));
  }

  return response;
}
