"use server";

import type { ActionResult } from "@/lib/domain";
import { getBackend } from "@/lib/server/backend";
import { backendMode, env, isReadOnlyPreview, PREVIEW_DISABLED_MESSAGE } from "@/lib/server/env";
import { nameError, passwordError, safeNext, str, validEmail } from "./validation";

/**
 * Customer authentication. Inputs are untrusted: validated here, then handed to
 * the active backend (Supabase Auth, or the local demo store). Errors returned
 * to the browser are generic and never reveal whether an email is registered
 * (except the sign-up "already exists" message, which sign-up inherently leaks).
 */

type Next = { next: string };

const GENERIC = "Something went wrong. Please try again.";
const PREVIEW = { ok: false as const, error: PREVIEW_DISABLED_MESSAGE };
const logError = (where: string, err: unknown) => console.error(`[auth] ${where}`, err instanceof Error ? err.message : err);

export async function registerAction(input: { fullName: unknown; email: unknown; password: unknown; next?: unknown }): Promise<ActionResult<Next & { needsConfirmation?: boolean }>> {
  const fieldErrors: Record<string, string> = {};
  const email = validEmail(input?.email);
  const nErr = nameError(input?.fullName);
  const pErr = passwordError(input?.password);
  if (nErr) fieldErrors.fullName = nErr;
  if (!email) fieldErrors.email = "Enter a valid email address.";
  if (pErr) fieldErrors.password = pErr;
  if (isReadOnlyPreview()) return PREVIEW;
  if (Object.keys(fieldErrors).length || !email) return { ok: false, error: "Please check the highlighted fields.", fieldErrors };

  try {
    const backend = await getBackend();
    const res = await backend.signUp({ email, password: input.password as string, fullName: str(input.fullName, 80) });
    if (!res.ok) {
      if (res.needsConfirmation) return { ok: true, data: { next: "/account/login", needsConfirmation: true } };
      return { ok: false, error: res.error };
    }
    return { ok: true, data: { next: safeNext(input.next) } };
  } catch (err) {
    logError("register", err);
    return { ok: false, error: GENERIC };
  }
}

export async function loginAction(input: { email: unknown; password: unknown; next?: unknown }): Promise<ActionResult<Next>> {
  if (isReadOnlyPreview()) return PREVIEW;
  const email = validEmail(input?.email);
  const password = typeof input?.password === "string" ? input.password : "";
  if (!email || !password || password.length > 128) {
    return {
      ok: false,
      error: "Please enter your email and password.",
      fieldErrors: { ...(email ? {} : { email: "Enter a valid email address." }), ...(password ? {} : { password: "Enter your password." }) },
    };
  }
  try {
    const backend = await getBackend();
    const res = await backend.signIn({ email, password });
    if (!res.ok) return { ok: false, error: res.needsConfirmation ? res.error : "Incorrect email or password." };
    return { ok: true, data: { next: safeNext(input.next) } };
  } catch (err) {
    logError("login", err);
    return { ok: false, error: GENERIC };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    const backend = await getBackend();
    await backend.signOut();
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "We couldn't sign you out. Please try again." };
  }
}

/** Always answers the same way whether or not the email exists. */
export async function requestPasswordResetAction(input: { email: unknown }): Promise<ActionResult<{ demoResetUrl?: string }>> {
  if (isReadOnlyPreview()) return PREVIEW;
  const email = validEmail(input?.email);
  if (!email) return { ok: false, error: "Enter a valid email address.", fieldErrors: { email: "Enter a valid email address." } };
  try {
    const backend = await getBackend();
    const demo = backendMode() === "demo";
    // Demo: a same-site relative link (no email service). Supabase: the email link
    // returns through /auth/callback, which sets the recovery session.
    const redirectTo = demo ? "/account/reset-password" : `${env.siteUrl}/auth/callback?next=${encodeURIComponent("/account/reset-password")}`;
    const res = await backend.requestPasswordReset(email, redirectTo);
    return { ok: true, data: demo && res.demoResetUrl ? { demoResetUrl: res.demoResetUrl } : {} };
  } catch {
    // Same response as success so the existence of an account is not revealed.
    return { ok: true, data: {} };
  }
}

export async function resetPasswordAction(input: { password: unknown; confirm: unknown; token?: unknown }): Promise<ActionResult<Next>> {
  if (isReadOnlyPreview()) return PREVIEW;
  const pErr = passwordError(input?.password);
  if (pErr) return { ok: false, error: pErr, fieldErrors: { password: pErr } };
  if (input.password !== input.confirm) return { ok: false, error: "The passwords don't match.", fieldErrors: { confirm: "The passwords don't match." } };
  const token = typeof input.token === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(input.token) ? input.token : undefined;
  try {
    const backend = await getBackend();
    if (backend.mode === "demo" && !token) return { ok: false, error: "This reset link is invalid or has expired." };
    const res = await backend.resetPassword({ password: input.password as string, token });
    if (!res.ok) return { ok: false, error: res.error || "This reset link is invalid or has expired." };
    return { ok: true, data: { next: "/account" } };
  } catch (err) {
    logError("resetPassword", err);
    return { ok: false, error: GENERIC };
  }
}
