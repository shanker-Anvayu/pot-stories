import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookies on each request (per the
 * @supabase/ssr guidance), so Server Components always see a valid session.
 *
 * - Demo mode (Supabase not configured): a no-op passthrough.
 * - No redirects or access control here — pages and actions do their own
 *   auth checks through lib/server/auth.ts.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Make refreshed tokens visible to this request's render…
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        // …and send them back to the browser, uncached.
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it validates
  // the JWT and triggers a token refresh when needed.
  try {
    await supabase.auth.getClaims();
  } catch {
    // Network/auth errors must never block the page; it will treat the user as signed out.
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * All paths except:
     * - _next/static, _next/image (build assets, image optimisation)
     * - favicon.ico and image files
     * - api/webhooks (provider webhooks carry no user session)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
