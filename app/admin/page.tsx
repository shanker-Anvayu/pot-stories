import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { StockEditor } from "@/components/admin/stock-editor";
import {
  AdminPageHeader,
  AdminSkeleton,
  EmptyState,
  Kpi,
  OrderStatusBadge,
  PaymentBadge,
  Panel,
  dateTime,
  tableCls,
  tbodyCls,
  tdCls,
  thCls,
  theadCls,
  trCls,
} from "@/components/admin/ui";
import { formatPrice } from "@/lib/format";
import { requireAdminPage } from "@/lib/server/auth";
import { getBackend } from "@/lib/server/backend";

export const metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  const user = await requireAdminPage();
  const backend = await getBackend();
  const [stats, orders] = await Promise.all([backend.admin.stats(), backend.admin.listOrders({})]);
  const recent = orders.slice(0, 8);

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description={`Signed in as ${user.fullName ?? user.email}`}
        actions={
          <Link href="/admin/products/new" className="btn btn-primary !px-4 !py-2 text-sm">
            Add product
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Products" value={stats.totalProducts} hint={`${stats.activeProducts} active`} />
        <Kpi label="Orders" value={stats.totalOrders} hint="All time, every status" />
        <Kpi label="Pending" value={stats.pendingOrders} hint="Awaiting payment or processing" tone={stats.pendingOrders > 0 ? "clay" : "default"} />
        <Kpi label="Verified revenue" value={formatPrice(stats.verifiedRevenue)} hint="Only orders with a verified payment" tone="leaf" />
        <Kpi label="Demo orders (not charged)" value={stats.demoOrders} hint="Excluded from revenue" />
        <Kpi label="Customers" value={stats.customers} hint={`${stats.newsletterSubscribers} newsletter subscribers`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel
          title={`Low stock (${stats.lowStock.length})`}
          action={
            <Link href="/admin/products?filter=low" className="text-xs font-semibold text-moss hover:text-forest-900">
              View products
            </Link>
          }
        >
          {stats.lowStock.length === 0 ? (
            <EmptyState title="Everything is well stocked" />
          ) : (
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Product</th>
                  <th className={thCls}>Variant</th>
                  <th className={thCls}>Threshold</th>
                  <th className={thCls}>Stock</th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {stats.lowStock.slice(0, 15).map((row) => (
                  <tr key={row.variantId} className={trCls}>
                    <td className={tdCls} data-label="Product">
                      <span className="font-semibold text-forest-900">{row.productName}</span>
                    </td>
                    <td className={tdCls} data-label="Variant">
                      {row.variantLabel}
                    </td>
                    <td className={tdCls} data-label="Threshold">
                      <span className="tabular-nums">
                        {row.stock === 0 ? <span className="font-semibold text-clay-dark">Out · </span> : null}≤ {row.threshold}
                      </span>
                    </td>
                    <td className={tdCls} data-label="Stock">
                      <StockEditor variantId={row.variantId} stock={row.stock} label={`${row.productName} — ${row.variantLabel}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          title="Recent orders"
          action={
            <Link href="/admin/orders" className="text-xs font-semibold text-moss hover:text-forest-900">
              All orders
            </Link>
          }
        >
          {recent.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Customer</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Payment</th>
                  <th className={`${thCls} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {recent.map((o) => (
                  <tr key={o.id} className={trCls}>
                    <td className={tdCls} data-label="Order">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold whitespace-nowrap text-forest-900 underline-offset-4 hover:underline">
                        {o.orderNumber}
                      </Link>
                      <span className="block text-xs text-moss max-md:hidden">{dateTime.format(new Date(o.createdAt))}</span>
                    </td>
                    <td className={tdCls} data-label="Customer">
                      <span className="truncate">{o.fullName}</span>
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
          )}
        </Panel>
      </div>
    </>
  );
}
