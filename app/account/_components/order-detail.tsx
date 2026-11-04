"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, CreditCard, FlaskConical, Loader2, MapPin, PackageCheck, Truck, X } from "lucide-react";
import { useState, useTransition } from "react";
import type { Order, OrderStatus } from "@/lib/domain";
import { cancelOrderAction, retryPayment } from "@/app/actions/checkout";
import { useRazorpay } from "@/app/checkout/_components/use-razorpay";
import { useSession } from "@/components/providers/session-provider";
import { cn, formatPrice } from "@/lib/format";
import { AddressLines } from "./address-form";
import { FormMessage } from "./form-ui";
import { PaymentBadge, StatusBadge, formatDateTime, isDemoOrder } from "./order-ui";

const curve = [0.165, 0.84, 0.44, 1] as const;

/* ---------------- confirmation header ---------------- */

function PlacedHeader({ order }: { order: Order }) {
  const demo = isDemoOrder(order);
  const pending = order.paymentStatus !== "paid" && !demo;
  return (
    <section className="grain relative overflow-hidden bg-forest-900 text-ivory">
      <div className="container-page relative flex flex-col items-center py-12 text-center sm:py-16">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="grid size-20 place-items-center rounded-full bg-leaf text-forest-900"
        >
          <svg viewBox="0 0 24 24" className="size-10" fill="none" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
        {[...Array(6)].map((_, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute top-[4.5rem] left-1/2 size-2 rounded-full bg-leaf sm:top-[5.5rem]"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 70, y: Math.sin((i / 6) * Math.PI * 2) * 70, opacity: [0, 1, 0] }}
            transition={{ delay: 0.35, duration: 0.9, ease: curve }}
          />
        ))}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease: curve }}>
          <p className="nav-caps mt-6 text-sage-300">{pending ? "Order saved" : "Order placed"}</p>
          <h1 className="display-heavy mt-3 text-[clamp(2.2rem,5vw,3.6rem)]">
            {pending ? (
              <>
                Almost <em className="text-leaf">there</em>
              </>
            ) : (
              <>
                Thank you{order.fullName ? `, ${order.fullName.split(" ")[0]}` : ""}. <em className="text-leaf">It&apos;s growing.</em>
              </>
            )}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-sage-200">
            Order <strong className="text-ivory">{order.orderNumber}</strong>
            {demo
              ? " was placed as a demo order — no payment was taken and nothing will be shipped."
              : pending
                ? " is waiting for payment. Complete it below to confirm your order."
                : ` is confirmed. A receipt has been recorded for ${order.email}.`}
          </p>
          {demo && (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-leaf/60 px-4 py-1.5 text-xs font-bold text-leaf">
              <FlaskConical className="size-3.5" aria-hidden /> Demo order — not charged
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function PlainHeader({ order }: { order: Order }) {
  return (
    <section className="border-b border-forest-900/10 bg-sage-100">
      <div className="container-page py-8 sm:py-10">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-sm font-bold text-forest-700 hover:text-forest-900">
          <ArrowLeft className="size-4" aria-hidden /> My account
        </Link>
        <h1 className="display-heavy mt-4 text-[clamp(1.9rem,4.5vw,3rem)] text-forest-900">Order {order.orderNumber}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
          <span className="text-sm text-moss">Placed {formatDateTime(order.createdAt)}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- timeline ---------------- */

const FLOW: { status: OrderStatus; label: string; icon: typeof Check }[] = [
  { status: "pending_payment", label: "Order placed", icon: Check },
  { status: "processing", label: "Preparing your plants", icon: PackageCheck },
  { status: "shipped", label: "On its way", icon: Truck },
  { status: "delivered", label: "Delivered", icon: MapPin },
];

function Timeline({ order }: { order: Order }) {
  const cancelled = order.status === "cancelled";
  const reached = cancelled ? 0 : FLOW.findIndex((s) => s.status === order.status);
  const paymentStep =
    order.paymentStatus === "paid"
      ? "Payment verified"
      : order.paymentStatus === "demo_not_charged"
        ? "Demo — no payment taken"
        : order.paymentStatus === "failed"
          ? "Payment failed"
          : order.paymentStatus === "refunded"
            ? "Refunded"
            : "Awaiting payment";
  return (
    <ol className="relative grid gap-0" aria-label="Order progress">
      {FLOW.map((step, i) => {
        const done = i <= reached;
        const Icon = step.icon;
        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {i < FLOW.length - 1 && (
              <span aria-hidden className="absolute top-9 bottom-0 left-[1.05rem] w-[2px] overflow-hidden rounded-full bg-forest-900/10">
                <motion.span
                  className="block w-full bg-forest-700"
                  initial={{ height: 0 }}
                  animate={{ height: i < reached ? "100%" : 0 }}
                  transition={{ delay: 0.2 + i * 0.25, duration: 0.4 }}
                />
              </span>
            )}
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.2, duration: 0.3 }}
              className={cn("relative grid size-[2.2rem] shrink-0 place-items-center rounded-full border-2", done ? "border-forest-800 bg-forest-800 text-ivory" : "border-forest-900/15 bg-card text-moss")}
            >
              <Icon className="size-4" aria-hidden />
            </motion.span>
            <div className="pt-1.5">
              <p className={cn("text-sm font-bold", done ? "text-forest-900" : "text-moss")}>
                {step.label}
                <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
              </p>
              {i === 0 && <p className="text-xs text-moss">{formatDateTime(order.createdAt)} · {paymentStep}</p>}
              {i === reached && i > 0 && <p className="text-xs text-moss">Updated {formatDateTime(order.updatedAt)}</p>}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="mt-5 flex gap-4">
          <span className="grid size-[2.2rem] shrink-0 place-items-center rounded-full bg-clay/15 text-clay-dark">
            <X className="size-4" aria-hidden />
          </span>
          <div className="pt-1.5">
            <p className="text-sm font-bold text-clay-dark">Order cancelled</p>
            <p className="text-xs text-moss">{formatDateTime(order.updatedAt)}</p>
          </div>
        </li>
      )}
    </ol>
  );
}

/* ---------------- actions for unpaid Razorpay orders ---------------- */

function PendingActions({ order }: { order: Order }) {
  const router = useRouter();
  const { payments } = useSession();
  const openRazorpay = useRazorpay();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [, start] = useTransition();

  const pay = () => {
    if (busy) return;
    setBusy("pay");
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await retryPayment(order.id);
      if (!res.ok) {
        setError(res.error);
        setBusy(null);
        return;
      }
      const outcome = await openRazorpay(order.id, res.data.razorpay);
      setBusy(null);
      if (outcome.status === "paid") router.replace(`/account/orders/${order.id}?placed=1`);
      else if (outcome.status === "dismissed") setInfo("Payment window closed. Your order is still saved — you can pay whenever you're ready.");
      else setError(outcome.message);
      router.refresh();
    });
  };

  const cancel = () => {
    if (busy || !window.confirm(`Cancel order ${order.orderNumber}? This can't be undone.`)) return;
    setBusy("cancel");
    setError(null);
    start(async () => {
      const res = await cancelOrderAction(order.id);
      setBusy(null);
      if (!res.ok) setError(res.error);
      else setInfo("Your order was cancelled. You haven't been charged.");
    });
  };

  return (
    <div className="rounded-[18px] border border-sand bg-sand/30 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-forest-900">
        <CreditCard className="size-4" aria-hidden /> Payment needed
      </p>
      <p className="mt-1 text-xs leading-relaxed text-moss">
        {order.paymentStatus === "failed" ? "Your last payment attempt didn't go through. " : ""}
        This order is reserved for you but won&apos;t be prepared until payment is verified.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
        {payments === "razorpay" && order.paymentMethod === "razorpay" && (
          <button type="button" onClick={pay} disabled={!!busy} aria-busy={busy === "pay" || undefined} className="btn btn-primary flex-1 disabled:opacity-60">
            {busy === "pay" && <Loader2 className="size-4 animate-spin" aria-hidden />} Complete payment · {formatPrice(order.total)}
          </button>
        )}
        <button type="button" onClick={cancel} disabled={!!busy} aria-busy={busy === "cancel" || undefined} className="btn btn-outline flex-1 text-forest-900 disabled:opacity-60">
          {busy === "cancel" && <Loader2 className="size-4 animate-spin" aria-hidden />} Cancel order
        </button>
      </div>
      <FormMessage error={error} success={error ? null : info} className="mt-3" />
    </div>
  );
}

/* ---------------- page body ---------------- */

export function OrderDetail({ order, placed }: { order: Order; placed: boolean }) {
  const demo = isDemoOrder(order);
  const latestPayment = order.payments[order.payments.length - 1];
  const canPay = order.status === "pending_payment" && (order.paymentStatus === "pending" || order.paymentStatus === "failed");
  const count = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {placed ? <PlacedHeader order={order} /> : <PlainHeader order={order} />}
      <div className="container-page py-10 sm:py-14">
        {placed && (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
            <span className="text-sm text-moss">Placed {formatDateTime(order.createdAt)}</span>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div className="grid gap-6">
            <section aria-labelledby="items-title" className="rounded-[18px] bg-card p-5 sm:p-7">
              <h2 id="items-title" className="font-display text-[1.35rem] font-semibold text-forest-900">
                {count} item{count === 1 ? "" : "s"}
              </h2>
              <ul className="mt-4 divide-y divide-forest-900/10">
                {order.items.map((it, i) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.35, ease: curve }}
                    className="flex gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <Link href={`/shop/${it.productSlug}`} className="relative aspect-[5/7] w-16 shrink-0 overflow-hidden rounded-[10px] bg-ivory sm:w-20">
                      <Image src={it.imageUrl} alt={it.productName} fill sizes="80px" className="object-cover mix-blend-multiply" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row">
                      <div className="min-w-0">
                        <Link href={`/shop/${it.productSlug}`} className="font-bold text-forest-900 hover:underline">
                          {it.productName}
                        </Link>
                        <p className="mt-0.5 text-xs text-moss">{[it.variantLabel, it.planterLabel].filter(Boolean).join(" · ")}</p>
                        <p className="mt-1 text-xs text-moss">
                          {formatPrice(it.unitPrice)} × {it.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold text-forest-900">{formatPrice(it.lineTotal)}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="progress-title" className="rounded-[18px] bg-card p-5 sm:p-7">
              <h2 id="progress-title" className="mb-5 font-display text-[1.35rem] font-semibold text-forest-900">
                Progress
              </h2>
              <Timeline order={order} />
            </section>
          </div>

          <aside className="grid gap-6">
            {canPay && !demo && <PendingActions order={order} />}

            <section aria-labelledby="summary-title" className="rounded-[18px] bg-card p-5 sm:p-7">
              <h2 id="summary-title" className="font-display text-[1.35rem] font-semibold text-forest-900">
                Summary
              </h2>
              <dl className="mt-4 grid gap-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-moss">Subtotal</dt>
                  <dd className="font-medium text-forest-900">{formatPrice(order.subtotal)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-moss">Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
                    <dd className="font-medium text-forest-700">−{formatPrice(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-moss">Delivery</dt>
                  <dd className="font-medium text-forest-900">{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-forest-900/10 pt-3">
                  <dt className="font-bold text-forest-900">Total</dt>
                  <dd className="text-xl font-semibold text-forest-900">{formatPrice(order.total)}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="payment-title" className="rounded-[18px] bg-card p-5 sm:p-7">
              <h2 id="payment-title" className="font-display text-[1.35rem] font-semibold text-forest-900">
                Payment
              </h2>
              <div className="mt-3">
                <PaymentBadge status={order.paymentStatus} />
              </div>
              {demo ? (
                <p className="mt-3 flex items-start gap-2 rounded-[12px] border border-dashed border-forest-700/30 bg-sage-50 p-3 text-xs leading-relaxed text-forest-700">
                  <FlaskConical className="mt-px size-3.5 shrink-0" aria-hidden />
                  Demo order — not charged. This preview has no payment provider connected, so no money was taken and the order will not be fulfilled.
                </p>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-moss">
                  Razorpay{latestPayment?.providerPaymentId ? ` · ${latestPayment.providerPaymentId}` : ""}
                  {latestPayment?.status === "failed" && latestPayment.errorDescription ? ` · ${latestPayment.errorDescription}` : ""}
                </p>
              )}
            </section>

            <section aria-labelledby="ship-title" className="rounded-[18px] bg-card p-5 sm:p-7">
              <h2 id="ship-title" className="mb-3 font-display text-[1.35rem] font-semibold text-forest-900">
                Delivering to
              </h2>
              <AddressLines a={order.shippingAddress} />
              <p className="mt-3 text-xs text-moss">Updates go to {order.email}</p>
              {order.notes && (
                <p className="mt-3 rounded-[10px] bg-ivory p-3 text-xs text-forest-800">
                  <span className="font-bold">Note:</span> {order.notes}
                </p>
              )}
            </section>

            <Link href="/shop" className="btn btn-outline text-forest-900">
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
