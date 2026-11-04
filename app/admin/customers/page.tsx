import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import {
  AdminPageHeader,
  AdminSkeleton,
  EmptyState,
  Pill,
  dateOnly,
  inputCls,
  tableCls,
  tbodyCls,
  tdCls,
  thCls,
  theadCls,
  trCls,
} from "@/components/admin/ui";
import { cn, formatPrice } from "@/lib/format";
import { requireAdminPage } from "@/lib/server/auth";
import { getBackend } from "@/lib/server/backend";

export const metadata = { title: "Customers" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<AdminSkeleton rows={10} />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const q = one((await searchParams).q).trim().slice(0, 100);
  const backend = await getBackend();
  const all = await backend.admin.listCustomers();
  const needle = q.toLowerCase();
  const customers = needle ? all.filter((c) => c.email.toLowerCase().includes(needle) || (c.fullName ?? "").toLowerCase().includes(needle)) : all;

  return (
    <>
      <AdminPageHeader title="Customers" description={`${all.length} account${all.length === 1 ? "" : "s"}. “Spent” counts verified payments only.`} />
      <form role="search" action="/admin/customers" className="relative mb-4 w-full sm:max-w-xs">
        <label htmlFor="customer-q" className="sr-only">
          Search customers
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-moss" aria-hidden />
        <input id="customer-q" name="q" type="search" defaultValue={q} placeholder="Search name or email" className={cn(inputCls, "pl-9")} />
      </form>

      {customers.length === 0 ? (
        <EmptyState title={q ? "No customers match" : "No customers yet"} />
      ) : (
        <div className="md:rounded-2xl md:border md:border-sand md:bg-card">
          <table className={tableCls}>
            <caption className="sr-only">Customers</caption>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Phone</th>
                <th className={thCls}>Joined</th>
                <th className={`${thCls} text-right`}>Orders</th>
                <th className={`${thCls} text-right`}>Spent</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {customers.map((c) => (
                <tr key={c.id} className={trCls}>
                  <td className={cn(tdCls, "before:content-none")}>
                    <span className="min-w-0 text-left">
                      <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-2 font-semibold text-forest-900 underline-offset-4 hover:underline">
                        <span className="truncate">{c.fullName || c.email}</span>
                        {c.role === "admin" && <Pill>Admin</Pill>}
                      </Link>
                      <span className="block truncate text-xs text-moss">{c.email}</span>
                    </span>
                  </td>
                  <td className={tdCls} data-label="Phone">
                    {c.phone ?? <span className="text-moss">—</span>}
                  </td>
                  <td className={tdCls} data-label="Joined">
                    <span className="whitespace-nowrap text-moss">{dateOnly.format(new Date(c.createdAt))}</span>
                  </td>
                  <td className={`${tdCls} md:text-right`} data-label="Orders">
                    <span className="tabular-nums">{c.orderCount}</span>
                  </td>
                  <td className={`${tdCls} md:text-right`} data-label="Spent">
                    <span className="font-semibold tabular-nums">{formatPrice(c.totalSpent)}</span>
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
