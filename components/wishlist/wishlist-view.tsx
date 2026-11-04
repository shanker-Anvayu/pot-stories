"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { useCatalog } from "@/components/providers/catalog-provider";
import { useHydrated, useStore } from "@/lib/store";

export function WishlistView() {
  const hydrated = useHydrated();
  const { wishlist } = useStore();
  const { bySlugs } = useCatalog();
  const items = bySlugs(wishlist);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[5/7] animate-pulse rounded-[14px] bg-card" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[16px] bg-card px-6 py-16 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-ivory text-clay">
          <Heart className="size-8" strokeWidth={1.5} aria-hidden />
        </span>
        <p className="display-heavy mt-6 text-3xl text-forest-900">Nothing saved yet</p>
        <p className="mx-auto mt-3 max-w-md text-moss">
          Tap the heart on any plant to save it here — a little shortlist for when you&apos;re ready.
        </p>
        <Link href="/shop" className="btn btn-primary mt-8">
          Browse plants
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-8 text-moss" aria-live="polite">
        {items.length} saved {items.length === 1 ? "plant" : "plants"}
      </p>
      <motion.ul layout className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <AnimatePresence mode="popLayout">
          {items.map((p) => (
            <motion.li
              key={p.slug}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
            >
              <ProductCard product={p} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </>
  );
}
