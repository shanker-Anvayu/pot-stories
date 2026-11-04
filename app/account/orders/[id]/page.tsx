import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getBackend } from "@/lib/server/backend";
import { requireUserPage } from "@/lib/server/auth";
import { OrderDetail } from "../../_components/order-detail";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false },
};

async function OrderContent({ params, searchParams }: PageProps<"/account/orders/[id]">) {
  await connection(); // session validity depends on the current time — request-time only
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireUserPage(`/account/orders/${encodeURIComponent(id)}`);
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) notFound();
  const backend = await getBackend();
  // Ownership-scoped lookup: another customer's order id simply isn't found.
  const order = await backend.getOrderForUser(user.id, id).catch(() => null);
  if (!order) notFound();
  return <OrderDetail order={order} placed={query.placed === "1"} />;
}

function OrderSkeleton() {
  return (
    <div aria-hidden>
      <section className="border-b border-forest-900/10 bg-sage-100">
        <div className="container-page py-8 sm:py-10">
          <div className="h-4 w-28 rounded-full bg-sage-200" />
          <div className="mt-5 h-11 w-80 max-w-full animate-pulse rounded-2xl bg-sage-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-24 rounded-full bg-sage-200" />
            <div className="h-6 w-24 rounded-full bg-sage-200" />
          </div>
        </div>
      </section>
      <div className="container-page grid gap-6 py-10 sm:py-14 lg:grid-cols-[1.5fr_1fr]">
        <div className="h-96 animate-pulse rounded-[18px] bg-card" />
        <div className="grid gap-6">
          <div className="h-44 animate-pulse rounded-[18px] bg-card" />
          <div className="h-36 animate-pulse rounded-[18px] bg-card" />
        </div>
      </div>
    </div>
  );
}

/** Params, search params and the session are all read inside Suspense. */
export default function OrderPage(props: PageProps<"/account/orders/[id]">) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent {...props} />
    </Suspense>
  );
}
