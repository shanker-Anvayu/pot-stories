import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { backendMode } from "@/lib/server/env";
import { createUserClient } from "@/lib/server/supabase/clients";

/**
 * Supabase auth callback (email confirmation, password recovery, magic links).
 * Supports the PKCE `code` flow and the `token_hash` + `type` flow, then
 * redirects to `next` when it is a safe same-site relative path.
 */

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
const DEFAULT_NEXT = "/account";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_NEXT;
  // Reject control characters and anything that would resolve off-site.
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_NEXT;
  try {
    const base = "http://localhost";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return DEFAULT_NEXT;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  if (backendMode() !== "supabase") {
    return NextResponse.redirect(new URL("/account/login", request.url));
  }

  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createUserClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("[auth/callback] exchangeCodeForSession failed", error.code, error.status);
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error("[auth/callback] verifyOtp failed", error.code, error.status);
  }

  if (ok) return NextResponse.redirect(new URL(next, request.url));

  const login = new URL("/account/login", request.url);
  login.searchParams.set("error", "link_invalid");
  return NextResponse.redirect(login);
}
