"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/actions/admin";
import type { OrderStatus } from "@/lib/domain";
import { orderStatusLabel } from "@/lib/domain";
import { cn } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import { ALLOWED_TRANSITIONS } from "./order-transitions";

const verb: Partial<Record<OrderStatus, string>> = {
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

/** Shows only the transitions allowed from the current status (the server enforces the same rules). */
export function OrderStatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const options = ALLOWED_TRANSITIONS[status];

  const apply = (next: OrderStatus) =>
    start(async () => {
      setError(null);
      const res = await updateOrderStatus(orderId, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirming(null);
      router.refresh();
    });

  if (options.length === 0) {
    return <p className="text-sm text-moss">This order is {orderStatusLabel[status].toLowerCase()} — no further status changes are available.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((next) => (
          <button
            key={next}
            type="button"
            disabled={pending}
            onClick={() => (next === "cancelled" ? setConfirming(next) : apply(next))}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60",
              next === "cancelled" ? "border border-clay/50 text-clay-dark hover:bg-clay/10" : "bg-forest-800 text-ivory hover:bg-forest-950",
            )}
          >
            {pending && confirming === null ? "Updating…" : (verb[next] ?? orderStatusLabel[next])}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-moss">Payment status can&rsquo;t be changed here — it is set only by verified payment confirmations.</p>
      {error && !confirming && (
        <p role="alert" className="mt-2 text-sm text-clay-dark">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirming !== null}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        pending={pending}
        error={confirming ? error : null}
        onConfirm={() => confirming && apply(confirming)}
        onClose={() => {
          setConfirming(null);
          setError(null);
        }}
      >
        The customer&rsquo;s order will be marked as cancelled. This can&rsquo;t be undone from the admin. Refunds, if any, must be issued from the payment
        provider&rsquo;s dashboard.
      </ConfirmDialog>
    </div>
  );
}
