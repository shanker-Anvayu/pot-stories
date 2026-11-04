"use server";

import type { ActionResult } from "@/lib/domain";
import { getBackend } from "@/lib/server/backend";
import { isReadOnlyPreview } from "@/lib/server/env";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Stores a newsletter subscription (Supabase table or local demo store). */
export async function subscribeNewsletter(email: unknown, source = "footer"): Promise<ActionResult<{ status: "subscribed" | "already_subscribed" }>> {
  if (typeof email !== "string" || email.length > 254 || !EMAIL.test(email.trim())) {
    return { ok: false, error: "Please enter a valid email address.", fieldErrors: { email: "Please enter a valid email address." } };
  }
  if (isReadOnlyPreview()) {
    return { ok: false, error: "Newsletter sign-up isn't active in this online preview — nothing was saved." };
  }
  try {
    const backend = await getBackend();
    const status = await backend.subscribeNewsletter(email.trim().toLowerCase(), String(source).slice(0, 40));
    return { ok: true, data: { status } };
  } catch {
    return { ok: false, error: "We couldn't save your subscription. Please try again." };
  }
}
