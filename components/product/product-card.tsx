"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FadeImage } from "@/components/ui/fade-image";
import { useUI } from "@/components/providers/ui-provider";
import { formatPrice, cn } from "@/lib/format";
import { hasPriceRange, hasVariants } from "@/lib/products";
import type { CatalogProduct } from "@/lib/domain";
import { firstAvailableVariantCode } from "@/components/providers/catalog-provider";
import { WishlistButton } from "./wishlist-button";
import { useAddToCart } from "./use-add-to-cart";

interface ProductCardProps {
  product: CatalogProduct;
  sizes?: string;
  preload?: boolean;
  className?: string;
  /** Overrides the automatic badge (e.g. "Festive pick"). */
  badge?: string;
}

function autoBadge(product: CatalogProduct) {
  if (product.stock <= 0) return { label: "Sold out", className: "bg-forest-950/80 text-ivory" };
  if (product.compareAtPrice) {
    const pct = Math.round((1 - product.price / product.compareAtPrice) * 100);
    return { label: `${pct}% off`, className: "bg-clay text-ivory" };
  }
  if (product.tags.includes("new")) return { label: "New", className: "bg-forest-800 text-ivory" };
  if (product.tags.includes("bestseller")) return { label: "Bestseller", className: "bg-leaf text-forest-900" };
  if (product.petFriendly) return { label: "Pet friendly", className: "bg-sage-200 text-forest-900" };
  return null;
}

export function ProductCard({ product, sizes, preload, className, badge }: ProductCardProps) {
  const addToCart = useAddToCart();
  const { openQuickView } = useUI();
  const auto = autoBadge(product);
  const tag = badge ? { label: badge, className: "bg-forest-800 text-ivory" } : auto;
  const secondary = product.gallery[0];
  const href = `/shop/${product.slug}`;
  const imgSizes = sizes ?? "(min-width: 1024px) 19vw, (min-width: 768px) 30vw, 44vw";

  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;
  // "Added ✓" feedback: the button morphs for 1.2s and a +1 chip floats up.
  const [added, setAdded] = useState(0);
  const [showAdded, setShowAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const quickAdd = () => {
    if (soldOut) return;
    if (hasVariants(product)) {
      openQuickView(product.slug);
      return;
    }
    if (addToCart(product.slug, { variant: firstAvailableVariantCode(product) })) {
      setAdded((k) => k + 1);
      setShowAdded(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShowAdded(false), 1200);
    }
  };

  return (
    <article className={cn("group/card relative flex h-full flex-col rounded-[14px] bg-card p-2 sm:p-2.5", className)}>
      <div className="relative aspect-[5/7] overflow-hidden rounded-[10px] bg-card">
        <Link href={href} aria-label={product.name} className="absolute inset-0 block">
          {/* Both images share one zoom layer, so the zoom is visible whichever image is showing. */}
          <span className="absolute inset-0 block transition-[scale] duration-[900ms] ease-[cubic-bezier(.26,.54,.32,1)] group-hover/card:scale-[1.07] motion-reduce:transition-none">
            {/* multiply blends studio-white backgrounds into the warm card colour */}
            <FadeImage src={product.image} alt={product.imageAlt} fill preload={preload} sizes={imgSizes} className="object-cover mix-blend-multiply" />
            {secondary && (
              <Image
                src={secondary.src}
                alt=""
                fill
                sizes={imgSizes}
                className="hidden object-cover opacity-0 transition-opacity duration-500 ease-[cubic-bezier(.26,.54,.32,1)] group-hover/card:opacity-100 md:block"
              />
            )}
          </span>
        </Link>

        <WishlistButton slug={product.slug} name={product.name} className="absolute top-1.5 left-1.5" />

        {tag && (
          <span
            className={cn(
              "pointer-events-none absolute top-2.5 right-2.5 rounded-full px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.06em] uppercase",
              tag.className,
            )}
          >
            {tag.label}
          </span>
        )}

        {/* Desktop quick add: slides up on hover */}
        <div
          className={cn(
            "absolute inset-x-2 bottom-2 hidden transition-[opacity,transform,translate,scale] duration-300 ease-[cubic-bezier(.165,.84,.44,1)] group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100 md:block",
            showAdded ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
          )}
        >
          <AddedChip burst={added} />
          <button
            type="button"
            onClick={quickAdd}
            disabled={soldOut}
            className={cn(
              "nav-caps relative h-10 w-full overflow-hidden rounded-full border backdrop-blur transition-colors duration-300 disabled:cursor-not-allowed disabled:border-forest-900/30 disabled:text-moss disabled:hover:bg-card/95",
              showAdded
                ? "border-forest-900 bg-forest-900 text-leaf"
                : "border-forest-900 bg-card/95 text-forest-900 hover:bg-forest-900 hover:text-ivory",
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={showAdded ? "added" : "idle"}
                className="absolute inset-0 flex items-center justify-center gap-1.5"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.165, 0.84, 0.44, 1] }}
              >
                {showAdded ? (
                  <>
                    <DrawnCheck className="size-4" /> Added
                  </>
                ) : soldOut ? (
                  "Sold out"
                ) : hasVariants(product) ? (
                  "Quick add"
                ) : (
                  "Add to bag"
                )}
              </motion.span>
            </AnimatePresence>
            <span className="sr-only" aria-live="polite">
              {showAdded ? `${product.name} added to bag` : ""}
            </span>
          </button>
        </div>

        {/* Mobile quick add */}
        <div className="absolute right-2 bottom-2 md:hidden">
          <AddedChip burst={added} compact />
          <motion.button
            type="button"
            onClick={quickAdd}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to bag`}
            animate={showAdded ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className={cn(
              "grid size-10 place-items-center rounded-full shadow-md transition-colors duration-300 active:scale-90 disabled:opacity-40",
              showAdded ? "bg-leaf text-forest-900" : "bg-forest-900 text-ivory",
            )}
          >
            {showAdded ? <DrawnCheck className="size-4" /> : <Plus className="size-4" aria-hidden />}
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-2 pt-3 pb-2">
        <h3 className="text-[0.92rem] leading-snug font-bold text-forest-900">
          <Link href={href} className="hover:underline hover:underline-offset-2">
            {product.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-[0.78rem] text-moss italic">{product.botanical}</p>
        <p className="mt-auto pt-2 text-[0.95rem] text-forest-900">
          {hasPriceRange(product) && <span className="mr-1 text-[0.72rem] text-moss">from</span>}
          <span className="font-semibold">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <span className="ml-2 text-[0.78rem] text-moss line-through">
              <span className="sr-only">was </span>
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </p>
        {lowStock && <p className="mt-1 text-[0.72rem] font-semibold text-clay">Only {product.stock} left</p>}
      </div>
    </article>
  );
}

/** Check mark that draws itself (0.35s). */
function DrawnCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
      />
    </svg>
  );
}

/** Small "+1" chip that floats up and fades from the add button (0.8s). */
function AddedChip({ burst, compact }: { burst: number; compact?: boolean }) {
  return (
    <AnimatePresence>
      {burst > 0 && (
        <motion.span
          key={burst}
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-2 z-10 rounded-full bg-leaf px-2 py-0.5 text-[0.68rem] font-bold text-forest-900 shadow",
            compact ? "right-1" : "left-1/2 -translate-x-1/2",
          )}
          initial={{ opacity: 0, y: 6, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], y: -34, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.165, 0.84, 0.44, 1] }}
        >
          +1
        </motion.span>
      )}
    </AnimatePresence>
  );
}
