import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "../env";

/**
 * Supabase clients. SERVER ONLY — never import this module from a
 * "use client" file: the service-role client bypasses row level security.
 */

function publicConfig() {
  const url = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }
  return { url, anonKey };
}

/**
 * Per-request client acting as the signed-in user (session from cookies).
 * Row level security applies. Create a new one for every request.
 */
export async function createUserClient(): Promise<SupabaseClient> {
  const { url, anonKey } = publicConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy (proxy.ts) refreshes the session cookies on every request.
        }
      },
    },
  });
}

/**
 * Anonymous, cookie-free client (public catalogue reads). Safe to use inside
 * `'use cache'` scopes, where request APIs such as cookies() are not allowed.
 */
export function createAnonClient(): SupabaseClient {
  const { url, anonKey } = publicConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Service-role client: BYPASSES row level security. Only use after the server
 * has authorised the action (e.g. requireAdmin, verified payment signature).
 */
export function createServiceClient(): SupabaseClient {
  const { url } = publicConfig();
  const serviceKey = env.supabaseServiceRoleKey;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. It is required on the server for orders, payments and admin actions.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
