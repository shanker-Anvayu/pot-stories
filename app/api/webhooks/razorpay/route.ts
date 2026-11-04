import { revalidateTag } from "next/cache";
import { getBackend } from "@/lib/server/backend";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { toPaise, verifyWebhookSignature } from "@/lib/server/razorpay";

/**
 * Razorpay webhook (server-to-server; no user cookie). The raw body is
 * authenticated with HMAC-SHA256 using RAZORPAY_WEBHOOK_SECRET before anything
 * is trusted. Finalisation is idempotent, so retries and races with the
 * browser-side verification are safe. Handled or ignored events return 200.
 */

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error_code?: string | null;
  error_description?: string | null;
}

interface WebhookEvent {
  event?: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    order?: { entity?: { id?: string; amount_paid?: number; currency?: string; status?: string } };
  };
}

const ok = (body: Record<string, unknown> = { received: true }) => Response.json(body, { status: 200 });

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const providerOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;

  try {
    const backend = await getBackend();
    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        if (!providerOrderId || !payment?.id) return ok({ ignored: "missing ids" });
        const record = await backend.getPaymentByProviderOrderId(providerOrderId);
        if (!record) return ok({ ignored: "unknown order" });
        const order = await backend.getOrderById(record.orderId);
        if (!order) return ok({ ignored: "unknown order" });
        if (order.paymentStatus === "paid") return ok({ status: "already_finalized" });
        if (payment.amount !== toPaise(order.total) || (payment.currency ?? "INR") !== "INR") {
          console.error(`[razorpay webhook] amount mismatch for order ${order.orderNumber}`);
          return ok({ ignored: "amount mismatch" });
        }
        if (payment.status && payment.status !== "captured") return ok({ ignored: `status ${payment.status}` });
        const result = await backend.finalizeOrder(order.id, {
          paymentId: record.id,
          paymentStatus: "paid",
          providerPaymentId: payment.id,
          recordStatus: "captured",
          raw: event,
        });
        if (result === "insufficient_stock") console.error(`[razorpay webhook] paid order ${order.orderNumber} could not reserve stock — needs manual review`);
        if (result === "finalized") revalidateTag(CATALOG_TAG, "max");
        return ok({ status: result });
      }
      case "payment.failed": {
        if (!providerOrderId) return ok({ ignored: "missing ids" });
        const record = await backend.getPaymentByProviderOrderId(providerOrderId);
        if (!record) return ok({ ignored: "unknown order" });
        await backend.markPaymentFailed(record.id, {
          providerPaymentId: payment?.id ?? null,
          errorCode: payment?.error_code ?? "payment_failed",
          errorDescription: payment?.error_description ?? null,
          raw: event,
        });
        return ok({ status: "marked_failed" });
      }
      default:
        return ok({ ignored: event.event ?? "unknown" });
    }
  } catch (err) {
    // 500 lets Razorpay retry later (finalisation is idempotent).
    console.error("[razorpay webhook]", err instanceof Error ? err.message : err);
    return Response.json({ error: "processing failed" }, { status: 500 });
  }
}
