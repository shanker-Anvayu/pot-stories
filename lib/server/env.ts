import "server-only";
import type { BackendMode, PaymentMode } from "@/lib/domain";

/**
 * Central, server-only environment access. Nothing here is ever sent to the
 * browser except values explicitly prefixed NEXT_PUBLIC_.
 */

const read = (key: string) => {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
};

/** Vercel exposes the deployment host (without protocol) at build and run time. */
const vercelHost = read("VERCEL_PROJECT_PRODUCTION_URL") ?? read("VERCEL_URL");

export const env = {
  siteUrl: read("NEXT_PUBLIC_SITE_URL") ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"),

  /**
   * Read-only preview: the local JSON demo database cannot persist on
   * serverless hosts (read-only, per-instance filesystem). On Vercel — or when
   * DEMO_READ_ONLY=true — the demo backend serves the seeded catalogue only and
   * every write (accounts, checkout, newsletter, admin) is switched off.
   * Set DEMO_READ_ONLY=false to override (not recommended on Vercel).
   */
  demoReadOnly: read("DEMO_READ_ONLY") === "true" || (read("VERCEL") === "1" && read("DEMO_READ_ONLY") !== "false"),

  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  /** Server only. Bypasses RLS — used after explicit server-side authorisation. */
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),

  razorpayKeyId: read("RAZORPAY_KEY_ID"),
  razorpayKeySecret: read("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: read("RAZORPAY_WEBHOOK_SECRET"),
  /** Live keys are refused unless this is explicitly "true" (business approval). */
  razorpayAllowLive: read("RAZORPAY_ALLOW_LIVE") === "true",

  /** Demo backend only: HMAC secret for the session cookie. */
  sessionSecret: read("SESSION_SECRET"),
  demoAdminEmail: read("DEMO_ADMIN_EMAIL"),
  demoAdminPassword: read("DEMO_ADMIN_PASSWORD"),

  /** Sample delivery pricing for the preview (business rules to be confirmed). */
  deliveryFee: Number(read("DELIVERY_FEE") ?? 99),
  freeDeliveryThreshold: Number(read("FREE_DELIVERY_THRESHOLD") ?? 999),
};

export function backendMode(): BackendMode {
  return env.supabaseUrl && env.supabaseAnonKey ? "supabase" : "demo";
}

/** True when the site is a browse-only preview (demo backend on a host without persistent storage). */
export function isReadOnlyPreview() {
  return backendMode() === "demo" && env.demoReadOnly;
}

/** Shown wherever an action is unavailable in the read-only preview. */
export const PREVIEW_DISABLED_MESSAGE =
  "This online preview is browse-only: accounts, checkout, newsletter sign-up and admin are switched off until the store's database and payments are connected. No orders or payments are taken.";

export type RazorpayConfigState = "configured" | "missing" | "live_blocked";

export function razorpayState(): RazorpayConfigState {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) return "missing";
  if (!env.razorpayKeyId.startsWith("rzp_test_") && !env.razorpayAllowLive) return "live_blocked";
  return "configured";
}

export function paymentMode(): PaymentMode {
  return razorpayState() === "configured" ? "razorpay" : "demo";
}
