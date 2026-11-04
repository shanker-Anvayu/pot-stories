import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView } from "@/components/shop/shop-view";

export const metadata: Metadata = {
  title: "Shop plants",
  description: "Browse indoor and outdoor plants, succulents, bonsai, herbs and growing kits. Filter by light, care level, size and price.",
};

function ShopFallback() {
  return (
    <div aria-hidden>
      <section className="border-b border-forest-900/10 bg-cream/60">
        <div className="container-page pt-10 pb-8 sm:pt-14">
          <div className="h-4 w-32 rounded-full bg-sand/70" />
          <div className="mt-6 h-14 w-72 max-w-full rounded-2xl bg-sand/70" />
          <div className="mt-4 h-4 w-96 max-w-full rounded-full bg-sand/50" />
          <div className="mt-8 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-full bg-sand/50" />
            ))}
          </div>
        </div>
      </section>
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[15rem_1fr]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 rounded-full bg-cream" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] animate-pulse rounded-[1.4rem] bg-cream" />
              <div className="mt-4 h-5 w-3/4 rounded-full bg-cream" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopView />
    </Suspense>
  );
}
