import type { ReactNode } from "react";
import Link from "next/link";
import type { OrderStatus, PaymentStatus } from "@/lib/domain";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/domain";
import { cn } from "@/lib/format";

/* Server-safe presentational pieces shared by the admin pages. */

export function AdminPageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-moss hover:text-forest-900">
            <span aria-hidden>←</span> {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-forest-900 sm:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-moss">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-sand bg-card p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-bold text-forest-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "leaf" | "clay" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "leaf" ? "border-forest-900/15 bg-leaf/50" : tone === "clay" ? "border-clay/30 bg-clay/5" : "border-sand bg-card",
      )}
    >
      <p className="nav-caps text-moss">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-forest-900 tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-moss">{hint}</p>}
    </div>
  );
}

const statusTone: Record<OrderStatus, string> = {
  pending_payment: "bg-sand text-forest-900",
  processing: "bg-sage-200 text-forest-900",
  shipped: "bg-forest-700 text-ivory",
  delivered: "bg-leaf text-forest-900",
  cancelled: "bg-clay/15 text-clay-dark",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", statusTone[status])}>
      {orderStatusLabel[status]}
    </span>
  );
}

const paymentTone: Record<PaymentStatus, string> = {
  pending: "border-sand bg-ivory text-moss",
  paid: "border-forest-700 bg-forest-800 text-ivory",
  failed: "border-clay/40 bg-clay/10 text-clay-dark",
  refunded: "border-sand bg-cream text-forest-900",
  demo_not_charged: "border-dashed border-clay/60 bg-ivory text-clay-dark",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", paymentTone[status])}>
      {paymentStatusLabel[status]}
    </span>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap",
        tone === "good" && "bg-leaf text-forest-900",
        tone === "warn" && "bg-clay/15 text-clay-dark",
        tone === "muted" && "bg-cream text-moss",
        tone === "default" && "bg-sage-100 text-forest-800",
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-oat bg-card/60 px-6 py-12 text-center">
      <p className="font-display text-lg text-forest-900">{title}</p>
      {children && <div className="mt-2 text-sm text-moss">{children}</div>}
    </div>
  );
}

export function AdminSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="animate-pulse space-y-4">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 rounded-lg bg-cream" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-cream" />
        ))}
      </div>
      <div className="space-y-2 rounded-2xl border border-sand bg-card p-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-9 rounded-lg bg-cream/70" />
        ))}
      </div>
    </div>
  );
}

export const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
export const dateOnly = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

/** Table helpers: tables collapse into stacked cards below `md` (cells label themselves via data-label). */
export const tableCls = "block w-full text-left text-sm md:table";
export const theadCls = "hidden md:table-header-group";
export const tbodyCls = "block md:table-row-group";
export const thCls = "border-b border-sand px-3 py-2 text-[0.68rem] font-bold tracking-[0.1em] whitespace-nowrap text-moss uppercase";
export const trCls =
  "mb-2 block rounded-xl border border-sand bg-card p-3 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:bg-transparent md:p-0 md:hover:bg-sage-50";
export const tdCls =
  "flex items-center justify-between gap-3 py-1 text-right before:text-xs before:font-semibold before:text-moss before:content-[attr(data-label)] md:table-cell md:px-3 md:py-2.5 md:text-left md:align-middle md:before:content-none";

export const inputCls =
  "w-full rounded-lg border border-oat bg-ivory px-3 py-2 text-sm text-ink placeholder:text-moss/70 focus:border-forest-600 aria-[invalid=true]:border-clay";
export const labelCls = "mb-1 block text-xs font-semibold text-forest-900";
export const smallBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
