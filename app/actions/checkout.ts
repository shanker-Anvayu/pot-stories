"use server";

import { refresh, revalidateTag } from "next/cache";
import type { ActionResult, Order, Quote, ShippingAddress } from "@/lib/domain";
import { getBackend } from "@/lib/server/backend";
import { AuthError, requireUser } from "@/lib/server/auth";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { paymentMode } from "@/lib/server/env";
import { generateOrderNumber, quoteCart } from "@/lib/server/pricing";
import { createRazorpayOrder, fetchRazorpayPayment, publicKeyId, toPaise, verifyCheckoutSignature } from "@/lib/server/razorpay";
import { nameError, str, validateAddress, validEmail, validPhone, type AddressFields } from "./validation";

/**
 * Checkout. Everything the browser sends is treated as a request, not a fact:
 * the cart is re-priced on the server, the user comes from the session, every
 * order lookup is scoped to that user, and an order is only marked paid after
 * BOTH the Razorpay signature and the Razorpay API confirm the payment.
 */

export interface RazorpayCheckoutParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
}

export type PlaceOrderResult =
  | { kind: "demo"; orderId: string; orderNumber: string }
  | { kind: "razorpay"; orderId: string; orderNumber: string; razorpay: RazorpayCheckoutParams }
  /** Nothing was charged; the bag changed on the server — show the fresh quote and let the user confirm. */
  | { kind: "needs_review"; message: string; quote: Quote };

export interface PlaceOrderInput {
  lines: unknown;
  addressId?: unknown;
  address?: unknown;
  saveAddress?: unknown;
  contact: { fullName: unknown; email: unknown; phone: unknown };
  discountCode?: unknown;
  notes?: unknown;
  idempotencyKey: unknown;
  /** The total the customer was shown. If the server total differs, we stop and show the new quote. */
  expectedTotal?: unknown;
}

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const KEY_RE = /^[A-Za-z0-9-]{16,80}$/;
const RZP_ID_RE = /^[A-Za-z0-9_]{6,64}$/;
const SIG_RE = /^[a-f0-9]{64}$/;

function fail(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error("[checkout]", err instanceof Error ? err.message : err);
  return { ok: false, error: fallback };
}

const cleanCode = (v: unknown) => {
  const code = str(v, 40).toUpperCase();
  return /^[A-Z0-9_-]{1,40}$/.test(code) ? code : null;
};

function invalidateCatalog() {
  // Stock changed: let the cached storefront catalogue refresh in the background.
  revalidateTag(CATALOG_TAG, "max");
}

/* ------------------------------------------------------------------ */
/* Quote                                                                */
/* ------------------------------------------------------------------ */

export async function getCheckoutQuote(lines: unknown, discountCode?: unknown): Promise<ActionResult<Quote>> {
  try {
    await requireUser();
    return { ok: true, data: await quoteCart(lines, cleanCode(discountCode)) };
  } catch (err) {
    return fail(err, "We couldn't price your bag. Please try again.");
  }
}

/* ------------------------------------------------------------------ */
/* Razorpay helpers                                                     */
/* ------------------------------------------------------------------ */

async function razorpayParamsFor(order: Order, reuseCreated: boolean): Promise<RazorpayCheckoutParams> {
  const keyId = publicKeyId();
  if (!keyId) throw new Error("Razorpay is not configured.");
  const backend = await getBackend();
  // Reuse the latest still-open Razorpay order (e.g. a double-click) instead of opening another.
  const open = reuseCreated
    ? [...order.payments].reverse().find((p) => p.provider === "razorpay" && p.status === "created" && p.providerOrderId && p.amount === order.total)
    : undefined;
  let providerOrderId = open?.providerOrderId ?? null;
  if (!providerOrderId) {
    const rzp = await createRazorpayOrder({ amountRupees: order.total, receipt: order.orderNumber, notes: { order_id: order.id, order_number: order.orderNumber } });
    if (rzp.amount !== toPaise(order.total) || rzp.currency !== "INR") throw new Error("Razorpay order amount mismatch.");
    await backend.addPayment({ orderId: order.id, provider: "razorpay", providerOrderId: rzp.id, amount: order.total, status: "created" });
    providerOrderId = rzp.id;
  }
  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  return {
    keyId,
    orderId: providerOrderId,
    amount: toPaise(order.total),
    currency: "INR",
    name: "Pot Stories",
    description: `Order ${order.orderNumber} · ${count} item${count === 1 ? "" : "s"}`,
    prefill: { name: order.fullName, email: order.email, contact: order.phone },
  };
}

/* ------------------------------------------------------------------ */
/* Place order                                                          */
/* ------------------------------------------------------------------ */

/** Serialises concurrent submits of the same idempotency key within this server process. */
const inflight = new Map<string, Promise<ActionResult<PlaceOrderResult>>>();

export async function placeOrder(input: PlaceOrderInput): Promise<ActionResult<PlaceOrderResult>> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return fail(err, "Please sign in to continue.");
  }
  const key = typeof input?.idempotencyKey === "string" && KEY_RE.test(input.idempotencyKey) ? input.idempotencyKey : null;
  if (!key) return { ok: false, error: "Your checkout session expired. Please refresh the page." };

  const lockKey = `${user.id}:${key}`;
  const running = inflight.get(lockKey);
  if (running) return running;
  const run = placeOrderLocked(user, key, input).finally(() => inflight.delete(lockKey));
  inflight.set(lockKey, run);
  return run;
}

async function placeOrderLocked(user: { id: string; email: string }, key: string, input: PlaceOrderInput): Promise<ActionResult<PlaceOrderResult>> {
  try {
    const backend = await getBackend();
    const mode = paymentMode();

    // Duplicate-order protection: the same key returns the order already created.
    const existing = await backend.findOrderByIdempotencyKey(user.id, key);
    if (existing) {
      if (existing.paymentStatus === "paid" || existing.paymentStatus === "demo_not_charged") {
        return { ok: true, data: { kind: "demo", orderId: existing.id, orderNumber: existing.orderNumber } };
      }
      if (existing.status === "pending_payment" && existing.paymentMethod === "razorpay" && mode === "razorpay") {
        return { ok: true, data: { kind: "razorpay", orderId: existing.id, orderNumber: existing.orderNumber, razorpay: await razorpayParamsFor(existing, true) } };
      }
      const quote = await quoteCart(input.lines, cleanCode(input.discountCode));
      return { ok: true, data: { kind: "needs_review", message: "Your previous attempt didn't go through. Please review your bag and try again.", quote } };
    }

    /* --- contact --- */
    const fieldErrors: Record<string, string> = {};
    const c = (input.contact ?? {}) as PlaceOrderInput["contact"];
    const nErr = nameError(c.fullName);
    const email = validEmail(c.email);
    const phone = validPhone(c.phone);
    if (nErr) fieldErrors["contact.fullName"] = nErr;
    if (!email) fieldErrors["contact.email"] = "Enter a valid email address.";
    if (!phone) fieldErrors["contact.phone"] = "Enter a 10-digit mobile number.";

    /* --- address (saved, owned by this user — or a new one) --- */
    let shipping: ShippingAddress | null = null;
    let toSave: AddressFields | null = null;
    if (typeof input.addressId === "string" && input.addressId) {
      if (!ID_RE.test(input.addressId)) return { ok: false, error: "Please choose a delivery address." };
      const saved = (await backend.listAddresses(user.id)).find((a) => a.id === input.addressId);
      if (!saved) return { ok: false, error: "That address is no longer saved. Please choose another." };
      const { fullName, phone: p, line1, line2, city, state, postalCode } = saved;
      shipping = { fullName, phone: p, line1, line2, city, state, postalCode, country: "IN" };
    } else {
      const parsed = validateAddress(input.address);
      if (!parsed.ok) for (const [k, v] of Object.entries(parsed.fieldErrors)) fieldErrors[`address.${k}`] = v;
      else {
        const { fullName, phone: p, line1, line2, city, state, postalCode } = parsed.value;
        shipping = { fullName, phone: p, line1, line2, city, state, postalCode, country: "IN" };
        if (input.saveAddress === true) toSave = parsed.value;
      }
    }
    if (Object.keys(fieldErrors).length || !shipping || !email || !phone) {
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }

    /* --- authoritative re-quote --- */
    const quote = await quoteCart(input.lines, cleanCode(input.discountCode));
    if (quote.lines.length === 0) {
      return quote.issues.length
        ? { ok: true, data: { kind: "needs_review", message: "The items in your bag are no longer available.", quote } }
        : { ok: false, error: "Your bag is empty." };
    }
    if (quote.issues.length) {
      return { ok: true, data: { kind: "needs_review", message: "Some items changed since you added them. Please review your bag.", quote } };
    }
    if (typeof input.expectedTotal === "number" && input.expectedTotal !== quote.total) {
      return { ok: true, data: { kind: "needs_review", message: "Prices were updated. Please review the new total before placing your order.", quote } };
    }
    if (mode === "razorpay" && quote.total < 1) return { ok: false, error: "This order total can't be paid online. Please adjust your bag." };

    if (toSave) await backend.saveAddress(user.id, { ...toSave, isDefault: false });

    const order = await backend.createOrder({
      orderNumber: generateOrderNumber(),
      userId: user.id,
      email,
      phone,
      fullName: str(c.fullName, 80),
      shippingAddress: shipping,
      paymentMethod: mode,
      subtotal: quote.subtotal,
      discount: quote.discount,
      deliveryFee: quote.deliveryFee,
      total: quote.total,
      discountCode: quote.discountCode,
      idempotencyKey: key,
      notes: str(input.notes, 500) || null,
      items: quote.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        planterId: l.planter,
        productSlug: l.slug,
        productName: l.name,
        variantLabel: l.variantLabel,
        planterLabel: l.planterLabel,
        imageUrl: l.image,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
    });

    if (mode === "razorpay") {
      try {
        const razorpay = await razorpayParamsFor(order, false);
        return { ok: true, data: { kind: "razorpay", orderId: order.id, orderNumber: order.orderNumber, razorpay } };
      } catch (err) {
        console.error("[checkout] razorpay order", err instanceof Error ? err.message : err);
        return { ok: false, error: `Your order ${order.orderNumber} is saved, but we couldn't start the payment. Please try again from your account.` };
      }
    }

    // DEMO: record a non-charging payment and finalise. Never marked as paid.
    const payment = await backend.addPayment({ orderId: order.id, provider: "demo", providerOrderId: null, amount: order.total, status: "demo_not_charged" });
    const result = await backend.finalizeOrder(order.id, { paymentId: payment.id, paymentStatus: "demo_not_charged", recordStatus: "demo_not_charged" });
    if (result === "insufficient_stock") {
      await backend.cancelPendingOrder(user.id, order.id);
      const fresh = await quoteCart(input.lines, cleanCode(input.discountCode));
      return { ok: true, data: { kind: "needs_review", message: "Someone just bought the last of an item in your bag. Please review the updated quantities.", quote: fresh } };
    }
    invalidateCatalog();
    return { ok: true, data: { kind: "demo", orderId: order.id, orderNumber: order.orderNumber } };
  } catch (err) {
    return fail(err, "We couldn't place your order. Nothing was charged — please try again.");
  }
}

/* ------------------------------------------------------------------ */
/* Razorpay verification                                                */
/* ------------------------------------------------------------------ */

export async function verifyRazorpayPayment(input: {
  orderId: unknown;
  razorpay_order_id: unknown;
  razorpay_payment_id: unknown;
  razorpay_signature: unknown;
}): Promise<ActionResult<{ orderId: string }>> {
  const VERIFY_FAILED = "We couldn't verify this payment, so your order hasn't been confirmed. If money left your account, it will be refunded automatically by Razorpay.";
  try {
    const user = await requireUser();
    const { orderId, razorpay_order_id: rzpOrderId, razorpay_payment_id: rzpPaymentId, razorpay_signature: signature } = input ?? {};
    if (typeof orderId !== "string" || !ID_RE.test(orderId)) return { ok: false, error: "Order not found." };
    if (typeof rzpOrderId !== "string" || !RZP_ID_RE.test(rzpOrderId) || typeof rzpPaymentId !== "string" || !RZP_ID_RE.test(rzpPaymentId)) {
      return { ok: false, error: VERIFY_FAILED };
    }

    const backend = await getBackend();
    const order = await backend.getOrderForUser(user.id, orderId);
    if (!order) return { ok: false, error: "Order not found." };
    const payment = await backend.getPaymentByProviderOrderId(rzpOrderId);
    if (!payment || payment.orderId !== order.id || payment.provider !== "razorpay") return { ok: false, error: VERIFY_FAILED };
    if (order.paymentStatus === "paid") return { ok: true, data: { orderId: order.id } };

    const markFailed = (code: string, description: string, raw?: unknown) =>
      backend.markPaymentFailed(payment.id, { providerPaymentId: rzpPaymentId, errorCode: code, errorDescription: description, raw });

    // 1. HMAC signature from Checkout.
    if (typeof signature !== "string" || !SIG_RE.test(signature) || !verifyCheckoutSignature({ orderId: rzpOrderId, paymentId: rzpPaymentId, signature })) {
      await markFailed("signature_mismatch", "Checkout signature verification failed.");
      return { ok: false, error: VERIFY_FAILED };
    }

    // 2. Independent confirmation from the Razorpay API.
    let rp;
    try {
      rp = await fetchRazorpayPayment(rzpPaymentId);
    } catch (err) {
      // Transient: don't mark failed — the webhook can still confirm it.
      console.error("[checkout] fetch payment", err instanceof Error ? err.message : err);
      return { ok: false, error: "We couldn't reach Razorpay to confirm your payment. Your order will update automatically once it's confirmed — please check your account shortly." };
    }
    const okStatus = rp.status === "captured" || rp.status === "authorized";
    if (!okStatus || rp.order_id !== rzpOrderId || rp.amount !== toPaise(order.total) || rp.currency !== "INR") {
      await markFailed(rp.error_code ?? "verification_failed", rp.error_description ?? `Payment status ${rp.status}; amount/order checks ${okStatus ? "failed" : "n/a"}.`, rp);
      return { ok: false, error: VERIFY_FAILED };
    }

    const result = await backend.finalizeOrder(order.id, {
      paymentId: payment.id,
      paymentStatus: "paid",
      providerPaymentId: rp.id,
      recordStatus: rp.status === "captured" ? "captured" : "authorized",
      raw: rp,
    });
    if (result === "insufficient_stock") {
      return { ok: false, error: `Your payment was received, but an item sold out moments before. We'll contact you about order ${order.orderNumber} and refund you in full if we can't fulfil it.` };
    }
    invalidateCatalog();
    return { ok: true, data: { orderId: order.id } };
  } catch (err) {
    return fail(err, "We couldn't confirm your payment. Please check your account in a moment.");
  }
}

export async function reportPaymentFailure(input: {
  orderId: unknown;
  razorpay_order_id: unknown;
  code?: unknown;
  description?: unknown;
  razorpay_payment_id?: unknown;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (typeof input?.orderId !== "string" || !ID_RE.test(input.orderId)) return { ok: false, error: "Order not found." };
    if (typeof input.razorpay_order_id !== "string" || !RZP_ID_RE.test(input.razorpay_order_id)) return { ok: false, error: "Order not found." };
    const backend = await getBackend();
    const order = await backend.getOrderForUser(user.id, input.orderId);
    if (!order) return { ok: false, error: "Order not found." };
    const payment = await backend.getPaymentByProviderOrderId(input.razorpay_order_id);
    if (!payment || payment.orderId !== order.id) return { ok: false, error: "Order not found." };
    if (order.paymentStatus === "paid") return { ok: true, data: undefined };
    await backend.markPaymentFailed(payment.id, {
      providerPaymentId: typeof input.razorpay_payment_id === "string" && RZP_ID_RE.test(input.razorpay_payment_id) ? input.razorpay_payment_id : null,
      errorCode: str(input.code, 80) || "payment_failed",
      errorDescription: str(input.description, 300) || null,
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Something went wrong.");
  }
}

/** Opens a fresh Razorpay checkout for an unpaid order. The order total is fixed at creation. */
export async function retryPayment(orderId: unknown): Promise<ActionResult<{ orderId: string; orderNumber: string; razorpay: RazorpayCheckoutParams }>> {
  try {
    const user = await requireUser();
    if (typeof orderId !== "string" || !ID_RE.test(orderId)) return { ok: false, error: "Order not found." };
    if (paymentMode() !== "razorpay") return { ok: false, error: "Online payment isn't available in this preview." };
    const backend = await getBackend();
    const order = await backend.getOrderForUser(user.id, orderId);
    if (!order) return { ok: false, error: "Order not found." };
    if (order.status !== "pending_payment" || order.paymentMethod !== "razorpay" || !(order.paymentStatus === "pending" || order.paymentStatus === "failed")) {
      return { ok: false, error: "This order doesn't need payment." };
    }
    if (order.total < 1) return { ok: false, error: "This order total can't be paid online." };
    return { ok: true, data: { orderId: order.id, orderNumber: order.orderNumber, razorpay: await razorpayParamsFor(order, false) } };
  } catch (err) {
    return fail(err, "We couldn't start the payment. Please try again.");
  }
}

export async function cancelOrderAction(orderId: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (typeof orderId !== "string" || !ID_RE.test(orderId)) return { ok: false, error: "Order not found." };
    const backend = await getBackend();
    const ok = await backend.cancelPendingOrder(user.id, orderId);
    if (!ok) return { ok: false, error: "This order can no longer be cancelled." };
    refresh();
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "We couldn't cancel this order. Please try again.");
  }
}
