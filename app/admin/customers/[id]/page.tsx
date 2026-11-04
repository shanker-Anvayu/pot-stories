import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminPageHeader,
  AdminSkeleton,
  EmptyState,
  Kpi,
  OrderStatusBadge,
  PaymentBadge,
  Panel,
  Pill,
  dateOnly,
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

export const metadata = { title: "Customer" };

export default function AdminCustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton rows={6} />}>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

async function CustomerDetail({ params }: { params: PageProps<"/admin/customers/[id]">["params"] }) {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const { id } = await params;
  const backend = await getBackend();
  const data = await backend.admin.getCustomer(id);
  if (!data) notFound();
  const { customer: c, orders, addresses } = data;
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <AdminPageHeader
        title={c.fullName || c.email}
        back={{ href: "/admin/customers", label: "Customers" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {c.role === "admin" && <Pill>Admin</Pill>}
            <a href={`mailto:${c.email}`} className="underline-offset-4 hover:underline">
              {c.email}
            </a>
            {c.phone && <span>· {c.phone}</span>}
            <span>· Joined {dateOnly.format(new Date(c.createdAt))}</span>
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <Kpi label="Orders" value={c.orderCount} />
        <Kpi label="Spent (verified)" value={formatPrice(c.totalSpent)} tone="leaf" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Orders">
          {sorted.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <table className={tableCls}>
              <thead className={theadCls}>
                <tr>
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Payment</th>
                  <th className={`${thCls} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {sorted.map((o) => (
                  <tr key={o.id} className={trCls}>
                    <td className={tdCls} data-label="Order">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold whitespace-nowrap text-forest-900 underline-offset-4 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className={tdCls} data-label="Date">
                      <span className="whitespace-nowrap text-moss">{dateTime.format(new Date(o.createdAt))}</span>
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

        <Panel title={`Addresses (${addresses.length})`}>
          {addresses.length === 0 ? (
            <p className="text-sm text-moss">No saved addresses.</p>
          ) : (
            <ul className="space-y-3">
              {addresses.map((a) => (
                <li key={a.id} className="rounded-xl border border-sand bg-ivory p-3 text-sm">
                  <p className="mb-1 flex items-center gap-2 font-semibold text-forest-900">
                    {a.label}
                    {a.isDefault && <Pill tone="good">Default</Pill>}
                  </p>
                  <address className="leading-relaxed not-italic">
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
                    {a.country} · {a.phone}
                  </address>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
