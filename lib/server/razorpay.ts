import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, razorpayState } from "./env";

/**
 * Razorpay integration (TEST MODE by default). Uses the REST API directly —
 * no SDK dependency. Live keys are refused unless RAZORPAY_ALLOW_LIVE=true.
 */

const API = "https://api.razorpay.com/v1";

function authHeader() {
  if (razorpayState() !== "configured") throw new Error("Razorpay is not configured for this environment.");
  return "Basic " + Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  error_code?: string | null;
  error_description?: string | null;
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);

export async function createRazorpayOrder(input: { amountRupees: number; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: toPaise(input.amountRupees), currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes ?? {} }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay order creation failed (${res.status}).`);
  return (await res.json()) as RazorpayOrder;
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Could not verify payment with Razorpay (${res.status}).`);
  return (await res.json()) as RazorpayPayment;
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }, secret = env.razorpayKeySecret) {
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  return safeEqualHex(expected, input.signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = env.razorpayWebhookSecret) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Public, browser-safe checkout parameters. */
export function publicKeyId() {
  return razorpayState() === "configured" ? (env.razorpayKeyId ?? null) : null;
}
