import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { AdminPageHeader, AdminSkeleton, OrderStatusBadge, PaymentBadge, Panel, Pill, dateTime } from "@/components/admin/ui";
import type { PaymentRecordStatus } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { requireAdminPage } from "@/lib/server/auth";
import { getBackend } from "@/lib/server/backend";

export const metadata = { title: "Order" };

const recordTone: Record<PaymentRecordStatus, "good" | "warn" | "muted" | "default"> = {
  created: "muted",
  authorized: "default",
  captured: "good",
  failed: "warn",
  refunded: "muted",
  demo_not_charged: "warn",
};

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton rows={8} />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const { id } = await params;
  const backend = await getBackend();
  const order = await backend.admin.getOrder(id);
  if (!order) notFound();
  const a = order.shippingAddress;
  const isDemo = order.paymentStatus === "demo_not_charged" || order.paymentMethod === "demo";

  return (
    <>
      <AdminPageHeader
        title={`Order ${order.orderNumber}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
            <span>Placed {dateTime.format(new Date(order.createdAt))}</span>
          </span>
        }
      />

      {isDemo && (
        <p className="mb-4 rounded-xl border border-dashed border-clay/60 bg-ivory px-4 py-3 text-sm text-clay-dark">
          <strong>Demo order — not charged.</strong> This order was placed in demo payment mode. No money was collected; it is excluded from verified revenue.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title={`Items (${order.items.reduce((s, i) => s + i.quantity, 0)})`}>
            <ul className="divide-y divide-sand">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-forest-900">{item.productName}</p>
                    <p className="text-xs text-moss">
                      {item.variantLabel}
                      {item.planterLabel ? ` · ${item.planterLabel}` : ""} · {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-sand pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-moss">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-moss">Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
                  <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-moss">Delivery</dt>
                <dd className="tabular-nums">{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-sand pt-2 text-base font-bold text-forest-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title={`Payments (${order.payments.length})`}>
            {order.payments.length === 0 ? (
              <p className="text-sm text-moss">No payment attempts recorded.</p>
            ) : (
              <ul className="space-y-3">
                {order.payments.map((p) => (
                  <li key={p.id} className="rounded-xl border border-sand bg-ivory p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-forest-900">{p.provider === "razorpay" ? "Razorpay" : "Demo"}</span>
                        <Pill tone={recordTone[p.status]}>{p.status === "demo_not_charged" ? "Demo — not charged" : p.status}</Pill>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatPrice(p.amount)} {p.currency !== "INR" ? p.currency : ""}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-moss">Provider order id</dt>
                        <dd className="font-mono break-all">{p.providerOrderId ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-moss">Provider payment id</dt>
                        <dd className="font-mono break-all">{p.providerPaymentId ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-moss">Recorded</dt>
                        <dd>{dateTime.format(new Date(p.createdAt))}</dd>
                      </div>
                      {(p.errorCode || p.errorDescription) && (
                        <div className="sm:col-span-2">
                          <dt className="text-clay-dark">Error</dt>
                          <dd className="text-clay-dark">
                            {p.errorCode && <span className="font-mono">{p.errorCode}</span>}
                            {p.errorCode && p.errorDescription ? " — " : ""}
                            {p.errorDescription}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Update status">
            <OrderStatusControl orderId={order.id} status={order.status} />
          </Panel>

          <Panel title="Customer">
            <p className="font-semibold text-forest-900">{order.fullName}</p>
            <p className="text-sm break-all">
              <a href={`mailto:${order.email}`} className="underline-offset-4 hover:underline">
                {order.email}
              </a>
            </p>
            <p className="text-sm">{order.phone}</p>
            {order.userId && (
              <Link href={`/admin/customers/${order.userId}`} className="mt-2 inline-block text-xs font-semibold text-moss underline-offset-4 hover:text-forest-900 hover:underline">
                View customer
              </Link>
            )}
          </Panel>

          <Panel title="Shipping address">
            <address className="text-sm leading-relaxed not-italic">
              {a.fullName}
              <br />
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.country}
              <br />
              {a.phone}
            </address>
          </Panel>

          {order.notes && (
            <Panel title="Order notes">
              <p className="text-sm whitespace-pre-line">{order.notes}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
