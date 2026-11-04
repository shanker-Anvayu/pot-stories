import "server-only";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/domain";
import { getBackend } from "./backend";

/**
 * Data Access Layer for identity. Every Server Action and protected page must
 * resolve the user through these helpers — never trust ids sent by the client.
 */

export async function getCurrentUser(): Promise<SessionUser | null> {
  const backend = await getBackend();
  try {
    return await backend.getSessionUser();
  } catch {
    return null;
  }
}

/** For pages: redirects to login (returning afterwards) when signed out. */
export async function requireUserPage(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For pages: only admins; others are redirected (no admin UI is ever rendered). */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent("/admin")}`);
  if (user.role !== "admin") redirect("/account?denied=admin");
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "unauthenticated" | "forbidden",
  ) {
    super(message);
  }
}

/** For Server Actions / route handlers. Throws AuthError. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please sign in to continue.", "unauthenticated");
  return user;
}

/** For Server Actions / route handlers. Verifies the admin role on the server. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AuthError("You don't have permission to do that.", "forbidden");
  return user;
}
