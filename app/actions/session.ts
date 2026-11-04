"use server";

import type { BackendMode, PaymentMode, SessionUser } from "@/lib/domain";
import { getCurrentUser } from "@/lib/server/auth";
import { backendMode, isReadOnlyPreview, paymentMode } from "@/lib/server/env";

export interface SessionSummary {
  user: SessionUser | null;
  backend: BackendMode;
  payments: PaymentMode;
  /** Browse-only online preview: accounts, checkout, newsletter and admin are off. */
  readOnly: boolean;
}

/** Lightweight, browser-safe description of who is signed in and which services are live. */
export async function getSessionSummary(): Promise<SessionSummary> {
  return { user: await getCurrentUser(), backend: backendMode(), payments: paymentMode(), readOnly: isReadOnlyPreview() };
}
