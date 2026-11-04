"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Tag } from "@/lib/products";
import { useCatalog } from "@/components/providers/catalog-provider";
import { cn } from "@/lib/format";

const tabs: { id: Tag; label: string }[] = [
  { id: "bestseller", label: "Bestsellers" },
  { id: "new", label: "New arrivals" },
  { id: "low-light", label: "Low light" },
  { id: "pet-friendly", label: "Pet friendly" },
];

export function Bestsellers() {
  const { products } = useCatalog();
  const [tab, setTab] = useState<Tag>("bestseller");
  const list = products.filter((p) => p.tags.includes(tab)).slice(0, 8);

  return (
    <section aria-labelledby="bestsellers-title" className="bg-ivory pb-24 sm:pb-32">
      <div className="container-page">
        <SectionHeading
          id="bestsellers-title"
          eyebrow="Most loved"
          title={
            <>
              Plants people <em className="text-forest-600">keep</em> coming back for
            </>
          }
          link={{ href: `/shop?tags=${tab}`, label: `Shop ${tabs.find((t) => t.id === tab)?.label.toLowerCase()}` }}
        />

        <div role="tablist" aria-label="Filter featured plants" className="no-scrollbar mt-10 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="bestsellers-panel"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                  active ? "text-ivory" : "text-forest-900 hover:bg-sage-100",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bestseller-tab"
                    className="absolute inset-0 rounded-full bg-forest-800"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div id="bestsellers-panel" role="tabpanel" className="mt-10">
          <AnimatePresence mode="wait">
            <motion.ul
              key={tab}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
              className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
            >
              {list.map((product) => (
                <motion.li
                  key={product.slug}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <ProductCard product={product} />
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
