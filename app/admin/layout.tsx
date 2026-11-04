import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Database, ExternalLink, ShieldCheck } from "lucide-react";
import { AdminSidebarNav, AdminTabsNav } from "@/components/admin/admin-nav";
import { backendMode } from "@/lib/server/env";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Pot Stories" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell. It deliberately does NOT read the session: every page checks
 * requireAdminPage() inside its own Suspense boundary, and every Server Action
 * re-checks the admin role. The shell itself contains no data.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const source = backendMode() === "supabase" ? "Supabase" : "Local demo database";
  const badge = (
    <span
      className={
        source === "Supabase"
          ? "inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-2.5 py-1 text-[0.68rem] font-bold text-ivory"
          : "inline-flex items-center gap-1.5 rounded-full border border-dashed border-clay/60 bg-ivory px-2.5 py-1 text-[0.68rem] font-bold text-clay-dark"
      }
      title="Where admin data is read from and written to"
    >
      <Database className="size-3" aria-hidden />
      {source}
    </span>
  );

  return (
    <div className="border-t border-sand bg-sage-50">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col lg:flex-row">
        <aside className="hidden w-60 shrink-0 border-r border-sand lg:block">
          <div className="sticky top-24 flex flex-col gap-6 p-5">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.18em] text-moss uppercase">
                <ShieldCheck className="size-3.5" aria-hidden /> Admin
              </p>
              <div className="mt-2">{badge}</div>
            </div>
            <nav aria-label="Admin">
              <Suspense fallback={<AdminSidebarNav static />}>
                <AdminSidebarNav />
              </Suspense>
            </nav>
            <Link href="/" className="inline-flex items-center gap-2 px-3 text-sm font-semibold text-moss hover:text-forest-900">
              <ExternalLink className="size-4" aria-hidden /> View store
            </Link>
          </div>
        </aside>

        <div className="border-b border-sand bg-ivory/80 px-4 py-3 lg:hidden">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.18em] text-moss uppercase">
              <ShieldCheck className="size-3.5" aria-hidden /> Admin
            </p>
            <div className="flex items-center gap-3">
              {badge}
              <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-moss hover:text-forest-900">
                View store <ExternalLink className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
          <nav aria-label="Admin">
            <Suspense fallback={<AdminTabsNav static />}>
              <AdminTabsNav />
            </Suspense>
          </nav>
        </div>

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
