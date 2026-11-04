import { connection } from "next/server";
import { Suspense } from "react";
import {
  AdminPageHeader,
  AdminSkeleton,
  EmptyState,
  Pill,
  dateTime,
  tableCls,
  tbodyCls,
  tdCls,
  thCls,
  theadCls,
  trCls,
} from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/auth";
import { getBackend } from "@/lib/server/backend";

export const metadata = { title: "Newsletter" };

export default function AdminNewsletterPage() {
  return (
    <Suspense fallback={<AdminSkeleton rows={10} />}>
      <Newsletter />
    </Suspense>
  );
}

async function Newsletter() {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const backend = await getBackend();
  const subscribers = await backend.admin.listNewsletter();
  const active = subscribers.filter((s) => s.status === "subscribed").length;

  return (
    <>
      <AdminPageHeader title="Newsletter" description={`${active} subscribed · ${subscribers.length} total sign-ups`} />
      {subscribers.length === 0 ? (
        <EmptyState title="No subscribers yet">Sign-ups from the footer and home page appear here.</EmptyState>
      ) : (
        <div className="md:rounded-2xl md:border md:border-sand md:bg-card">
          <table className={tableCls}>
            <caption className="sr-only">Newsletter subscribers</caption>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Email</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Source</th>
                <th className={thCls}>Signed up</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {subscribers.map((s) => (
                <tr key={s.email} className={trCls}>
                  <td className={tdCls} data-label="Email">
                    <span className="truncate font-medium text-forest-900">{s.email}</span>
                  </td>
                  <td className={tdCls} data-label="Status">
                    <Pill tone={s.status === "subscribed" ? "good" : "muted"}>{s.status}</Pill>
                  </td>
                  <td className={tdCls} data-label="Source">
                    <span className="text-moss">{s.source}</span>
                  </td>
                  <td className={tdCls} data-label="Signed up">
                    <span className="whitespace-nowrap text-moss">{dateTime.format(new Date(s.createdAt))}</span>
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
