"use client";

import { useCallback } from "react";
import type { RazorpayCheckoutParams } from "@/app/actions/checkout";
import { reportPaymentFailure, verifyRazorpayPayment } from "@/app/actions/checkout";

/**
 * Opens Razorpay Checkout (test mode) for a server-created Razorpay order and
 * hands the result back to the server for verification. The browser never
 * decides that an order is paid — verifyRazorpayPayment does, after checking
 * the signature AND fetching the payment from Razorpay's API.
 */

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayFailure {
  error?: { code?: string; description?: string; metadata?: { order_id?: string; payment_id?: string } };
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (resp: RazorpayFailure) => void): void;
}
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let scriptPromise: Promise<RazorpayCtor> | null = null;

function loadScript(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<RazorpayCtor>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay unavailable")));
    el.onerror = () => {
      scriptPromise = null;
      el.remove();
      reject(new Error("Could not load Razorpay"));
    };
    document.body.appendChild(el);
  });
  return scriptPromise;
}

export type RazorpayOutcome =
  | { status: "paid"; orderId: string }
  | { status: "dismissed" }
  | { status: "failed"; message: string }
  | { status: "verify_failed"; message: string };

/** Resolves once the customer pays (and the server verified it), closes the modal, or the script fails to load. */
export function useRazorpay() {
  return useCallback(async (orderId: string, params: RazorpayCheckoutParams): Promise<RazorpayOutcome> => {
    let Razorpay: RazorpayCtor;
    try {
      Razorpay = await loadScript();
    } catch {
      return { status: "failed", message: "We couldn't load Razorpay. Check your connection or disable content blockers, then try again." };
    }

    return new Promise<RazorpayOutcome>((resolve) => {
      let settled = false;
      let lastFailure: string | null = null;
      const finish = (o: RazorpayOutcome) => {
        if (settled) return;
        settled = true;
        resolve(o);
      };

      const rzp = new Razorpay({
        key: params.keyId,
        amount: params.amount,
        currency: params.currency,
        name: params.name,
        description: params.description,
        order_id: params.orderId,
        prefill: params.prefill,
        notes: { order_id: orderId },
        theme: { color: "#14281d" },
        retry: { enabled: true },
        handler: async (resp: RazorpaySuccess) => {
          const res = await verifyRazorpayPayment({ orderId, ...resp });
          finish(res.ok ? { status: "paid", orderId: res.data.orderId } : { status: "verify_failed", message: res.error });
        },
        modal: {
          // Closing the modal leaves the order pending so the customer can retry.
          ondismiss: () => finish(lastFailure ? { status: "failed", message: lastFailure } : { status: "dismissed" }),
          confirm_close: true,
        },
      });

      rzp.on("payment.failed", (resp) => {
        lastFailure = resp.error?.description || "The payment didn't go through.";
        void reportPaymentFailure({
          orderId,
          razorpay_order_id: resp.error?.metadata?.order_id ?? params.orderId,
          razorpay_payment_id: resp.error?.metadata?.payment_id,
          code: resp.error?.code,
          description: resp.error?.description,
        });
      });
      rzp.open();
    });
  }, []);
}
