import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import {
  AdminPageHeader,
  AdminSkeleton,
  EmptyState,
  OrderStatusBadge,
  PaymentBadge,
  dateTime,
  inputCls,
  labelCls,
  tableCls,
  tbodyCls,
  tdCls,
  thCls,
  theadCls,
  trCls,
} from "@/components/admin/ui";
import { ORDER_STATUSES, orderStatusLabel, paymentStatusLabel, type OrderStatus, type PaymentStatus } from "@/lib/domain";
import { cn, formatPrice } from "@/lib/format";
import { requireAdminPage } from "@/lib/server/auth";
import { getBackend } from "@/lib/server/backend";

export const metadata = { title: "Orders" };

const PAYMENT_STATUSES = Object.keys(paymentStatusLabel) as PaymentStatus[];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<AdminSkeleton rows={10} />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const statusRaw = one(sp.status);
  const paymentRaw = one(sp.payment);
  const status: OrderStatus | "all" = (ORDER_STATUSES as string[]).includes(statusRaw) ? (statusRaw as OrderStatus) : "all";
  const payment: PaymentStatus | "all" = (PAYMENT_STATUSES as string[]).includes(paymentRaw) ? (paymentRaw as PaymentStatus) : "all";

  const backend = await getBackend();
  const orders = await backend.admin.listOrders({ query: q || undefined, status, payment });
  const filtered = Boolean(q) || status !== "all" || payment !== "all";

  return (
    <>
      <AdminPageHeader title="Orders" description={`${orders.length} order${orders.length === 1 ? "" : "s"}${filtered ? " matching filters" : ""}`} />

      <form role="search" action="/admin/orders" className="mb-4 grid gap-3 rounded-2xl border border-sand bg-card p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="relative">
          <label htmlFor="order-q" className={labelCls}>
            Search
          </label>
          <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-moss" aria-hidden />
          <input id="order-q" name="q" type="search" defaultValue={q} placeholder="Order no., email or name" className={cn(inputCls, "pl-9")} />
        </div>
        <div>
          <label htmlFor="order-status" className={labelCls}>
            Status
          </label>
          <select id="order-status" name="status" defaultValue={status} className={inputCls}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="order-payment" className={labelCls}>
            Payment
          </label>
          <select id="order-payment" name="payment" defaultValue={payment} className={inputCls}>
            <option value="all">All payments</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {paymentStatusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary !px-4 !py-2 text-sm">
            Apply
          </button>
          {filtered && (
            <Link href="/admin/orders" className="rounded-full px-3 py-2 text-sm font-bold text-forest-800 hover:bg-sage-100">
              Clear
            </Link>
          )}
        </div>
      </form>

      {orders.length === 0 ? (
        <EmptyState title={filtered ? "No orders match" : "No orders yet"}>{filtered ? "Try a different search or filter." : "Orders appear here once customers check out."}</EmptyState>
      ) : (
        <div className="md:rounded-2xl md:border md:border-sand md:bg-card">
          <table className={tableCls}>
            <caption className="sr-only">Orders</caption>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Order</th>
                <th className={thCls}>Date</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Items</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Payment</th>
                <th className={`${thCls} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {orders.map((o) => (
                <tr key={o.id} className={trCls}>
                  <td className={tdCls} data-label="Order">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold whitespace-nowrap text-forest-900 underline-offset-4 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className={tdCls} data-label="Date">
                    <span className="whitespace-nowrap text-moss">{dateTime.format(new Date(o.createdAt))}</span>
                  </td>
                  <td className={tdCls} data-label="Customer">
                    <span className="min-w-0 text-right md:text-left">
                      <span className="block truncate">{o.fullName}</span>
                      <span className="block truncate text-xs text-moss">{o.email}</span>
                    </span>
                  </td>
                  <td className={tdCls} data-label="Items">
                    <span className="tabular-nums">{o.items.reduce((s, i) => s + i.quantity, 0)}</span>
                  </td>
                  <td className={tdCls} data-label="Status">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className={tdCls} data-label="Payment">
                    <PaymentBadge status={o.paymentStatus} />
                  </td>
                  <td className={`${tdCls} md:text-right`} data-label="Total">
                    <span className="font-semibold tabular-nums">{formatPrice(o.total)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
