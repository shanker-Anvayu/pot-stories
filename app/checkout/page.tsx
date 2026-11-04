import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowLeft, Lock } from "lucide-react";
import { getBackend } from "@/lib/server/backend";
import { requireUserPage } from "@/lib/server/auth";
import { CheckoutFlow, CheckoutSkeleton } from "./_components/checkout-flow";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

async function CheckoutGate() {
  // Session read happens at request time, behind Suspense. Signed-out visitors go to sign-in and come back.
  await connection(); // session validity depends on the current time — request-time only
  const user = await requireUserPage("/checkout");
  const backend = await getBackend();
  const [profile, addresses] = await Promise.all([backend.getProfile(user.id), backend.listAddresses(user.id)]);
  return (
    <CheckoutFlow
      profile={profile ?? { id: user.id, email: user.email, fullName: user.fullName, phone: null, role: user.role, createdAt: new Date().toISOString() }}
      addresses={addresses}
    />
  );
}

export default function CheckoutPage() {
  return (
    <>
      <div className="container-page flex flex-col gap-4 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between sm:pt-12 sm:pb-8">
        <div>
          <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-bold text-forest-700 hover:text-forest-900">
            <ArrowLeft className="size-4" aria-hidden /> Continue shopping
          </Link>
          <h1 className="display-heavy mt-3 text-[clamp(2.2rem,5vw,3.4rem)] text-forest-900">
            Check<em className="text-forest-600">out</em>
          </h1>
        </div>
        <p className="flex items-center gap-2 text-xs font-semibold text-moss">
          <Lock className="size-3.5" aria-hidden /> Prices and stock are confirmed on our server
        </p>
      </div>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutGate />
      </Suspense>
    </>
  );
}
