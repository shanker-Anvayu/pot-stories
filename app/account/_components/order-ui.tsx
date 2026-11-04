import type { Order, OrderStatus, PaymentStatus } from "@/lib/domain";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/domain";
import { cn } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

const statusTone: Record<OrderStatus, string> = {
  pending_payment: "bg-sand/70 text-forest-900",
  processing: "bg-sage-200 text-forest-900",
  shipped: "bg-leaf text-forest-900",
  delivered: "bg-forest-800 text-ivory",
  cancelled: "bg-cream text-moss line-through decoration-moss/40",
};

const paymentTone: Record<PaymentStatus, string> = {
  pending: "bg-sand/70 text-forest-900",
  paid: "bg-forest-800 text-ivory",
  failed: "bg-clay/15 text-clay-dark",
  refunded: "bg-cream text-moss",
  demo_not_charged: "border border-dashed border-forest-700/40 bg-sage-50 text-forest-700",
};

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.06em] uppercase whitespace-nowrap";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn(pill, statusTone[status])}>{orderStatusLabel[status]}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn(pill, paymentTone[status])}>{status === "demo_not_charged" ? "Demo — not charged" : paymentStatusLabel[status]}</span>;
}

export const isDemoOrder = (o: Pick<Order, "paymentStatus" | "paymentMethod">) => o.paymentStatus === "demo_not_charged" || o.paymentMethod === "demo";
