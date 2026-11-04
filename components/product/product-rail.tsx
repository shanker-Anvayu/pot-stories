"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ProductCard } from "./product-card";
import { easeOutExpo } from "@/components/motion/text-reveal";
import type { CatalogProduct as Product } from "@/lib/domain";
import { cn } from "@/lib/format";

interface ProductRailProps {
  id: string;
  title: ReactNode;
  products: Product[];
  viewAll?: { href: string; label?: string };
  /** "grid" wraps into rows on desktop (bestsellers); "row" stays a single row. */
  layout?: "grid" | "row";
  badge?: (p: Product) => string | undefined;
  description?: string;
  className?: string;
  /** Small caps line above the title. */
  eyebrow?: string;
}

const railParent = { hidden: {}, show: { transition: { staggerChildren: 0.075, delayChildren: 0.05 } } };
const railChild = {
  hidden: { opacity: 0, y: 36, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { opacity: { duration: 0.5 }, y: { duration: 0.9, ease: easeOutExpo }, scale: { duration: 0.9, ease: easeOutExpo } },
  },
};

/**
 * Product collection strip. Desktop: 5-up grid. Tablet & mobile: horizontal,
 * swipeable snap carousel with ~2.3 cards visible and arrow controls.
 */
export function ProductRail({ id, title, products, viewAll, layout = "row", badge, description, className, eyebrow }: ProductRailProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    const raf = requestAnimationFrame(updateEdges);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section aria-labelledby={`${id}-title`} className={cn("py-10 sm:py-14", className)}>
      <div className="container-page">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 0.8, ease: easeOutExpo }}
          >
            {eyebrow && <p className="eyebrow mb-2.5 text-clay">{eyebrow}</p>}
            <h2 id={`${id}-title`} className="display-heavy text-[clamp(1.85rem,3.4vw,2.75rem)] text-forest-900">
              {title}
            </h2>
            {description && <p className="mt-2 max-w-xl text-sm text-moss sm:text-[0.95rem]">{description}</p>}
          </motion.div>
          {viewAll && (
            <Link
              href={viewAll.href}
              className="group hidden shrink-0 items-center gap-1.5 text-sm font-bold text-forest-900 lg:inline-flex"
            >
              <span className="link-underline pb-0.5">{viewAll.label ?? "View all"}</span>
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          )}
          <div className="flex gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={edges.start}
              aria-label="Scroll products left"
              className="grid size-11 place-items-center rounded-full border border-forest-900/20 bg-card text-forest-900 transition-opacity disabled:opacity-35"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={edges.end}
              aria-label="Scroll products right"
              className="grid size-11 place-items-center rounded-full border border-forest-900/20 bg-card text-forest-900 transition-opacity disabled:opacity-35"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <motion.ul
          ref={trackRef}
          variants={railParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -6% 0px" }}
          className={cn(
            "rail lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0",
            layout === "grid" && "lg:gap-y-5",
          )}
        >
          {products.map((product, i) => (
            <motion.li key={product.slug} variants={railChild} className="w-[44%] sm:w-[31%] md:w-[27%] lg:w-auto">
              <ProductCard product={product} badge={badge?.(product)} preload={i < 2 && id === "bestsellers"} />
            </motion.li>
          ))}
        </motion.ul>

        {viewAll && (
          <div className="mt-8 flex justify-center lg:hidden">
            <Link href={viewAll.href} className="btn btn-primary min-w-36">
              {viewAll.label ?? "View all"}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
