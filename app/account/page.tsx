import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getBackend } from "@/lib/server/backend";
import { requireUserPage } from "@/lib/server/auth";
import { AccountDashboard } from "./_components/account-dashboard";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

async function AccountContent({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  // Reads the session cookie: request-time, so this sits behind Suspense.
  await connection(); // session validity depends on the current time — request-time only
  const user = await requireUserPage("/account");
  const backend = await getBackend();
  const [profile, addresses, orders, params] = await Promise.all([
    backend.getProfile(user.id),
    backend.listAddresses(user.id),
    backend.listOrdersForUser(user.id),
    searchParams,
  ]);
  const fallbackProfile = { id: user.id, email: user.email, fullName: user.fullName, phone: null, role: user.role, createdAt: new Date().toISOString() };
  return <AccountDashboard profile={profile ?? fallbackProfile} addresses={addresses} orders={orders} deniedAdmin={params.denied === "admin"} />;
}

function AccountSkeleton() {
  return (
    <div aria-hidden>
      <section className="border-b border-forest-900/10 bg-sage-100">
        <div className="container-page py-10 sm:py-12">
          <div className="h-3.5 w-24 rounded-full bg-sage-200" />
          <div className="mt-4 h-12 w-72 max-w-full animate-pulse rounded-2xl bg-sage-200" />
          <div className="mt-3 h-3.5 w-48 rounded-full bg-sage-200" />
        </div>
      </section>
      <div className="container-page grid gap-6 py-10 sm:py-14 lg:grid-cols-[1.5fr_1fr]">
        <div className="h-80 animate-pulse rounded-[18px] bg-card" />
        <div className="grid gap-6">
          <div className="h-48 animate-pulse rounded-[18px] bg-card" />
          <div className="h-48 animate-pulse rounded-[18px] bg-card" />
        </div>
      </div>
    </div>
  );
}

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountContent searchParams={searchParams} />
    </Suspense>
  );
}
