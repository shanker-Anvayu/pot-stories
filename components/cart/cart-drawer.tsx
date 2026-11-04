"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useRef } from "react";
import { useUI } from "@/components/providers/ui-provider";
import { useDialog } from "@/lib/use-dialog";
import { MAX_QUANTITY, storeActions, useCartSummary } from "@/lib/store";
import { useCatalog } from "@/components/providers/catalog-provider";
import { formatPrice } from "@/lib/format";

const curve = [0.165, 0.84, 0.44, 1] as const;
const UPSELL_SLUG = "essential-repotting-kit";

const popularCollectionDefs = [
  { label: "Bestsellers", href: "/shop?tags=bestseller", slug: "monstera-deliciosa" },
  { label: "Pet-friendly plants", href: "/shop?tags=pet-friendly", slug: "red-prayer-plant" },
  { label: "Gifts", href: "/shop?tags=gift", slug: "succulent-trio" },
  { label: "Easy for beginners", href: "/shop?tags=beginner", slug: "zz-plant" },
];

export function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { bySlug, planters } = useCatalog();
  const popularCollections = popularCollectionDefs.map((c) => ({ ...c, image: bySlug(c.slug)?.image }));
  const panelRef = useRef<HTMLDivElement>(null);
  const { lines, count, subtotal } = useCartSummary();
  useDialog(cartOpen, closeCart, panelRef);

  const upsell = bySlug(UPSELL_SLUG);
  const showUpsell = upsell && lines.length > 0 && !lines.some((l) => l.slug === UPSELL_SLUG);

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-forest-950/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 0.25, ease: [0.55, 0, 0.75, 0.2] } }}
            transition={{ duration: 0.35, ease: curve }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col bg-sage-50 shadow-2xl"
          >
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <div className="relative flex items-center justify-center border-b border-forest-900/10 px-6 py-4">
                <h2 id="cart-title" className="nav-caps text-[0.82rem] text-forest-900">
                  Your bag {count > 0 && <span className="text-moss">({count})</span>}
                </h2>
                <button
                  type="button"
                  onClick={closeCart}
                  aria-label="Close bag"
                  className="absolute right-3 grid size-10 place-items-center rounded-full text-forest-900 hover:bg-sage-100"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              {lines.length === 0 ? (
                <div className="flex-1 overflow-y-auto px-6 py-8 text-center">
                  <p className="text-sm text-moss">Your bag is currently empty.</p>
                  <button type="button" onClick={closeCart} className="btn btn-primary mt-4">
                    Continue shopping
                  </button>
                  <p className="mt-10 font-display text-xl font-medium text-forest-900">Popular collections</p>
                  <ul className="mt-5 grid grid-cols-2 gap-3 text-left">
                    {popularCollections.map((c, i) => (
                      <motion.li
                        key={c.href}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.06, duration: 0.45 }}
                      >
                        <Link href={c.href} onClick={closeCart} className="group block">
                          <span className="relative block aspect-square overflow-hidden rounded-[12px] bg-card">
                            {c.image && (
                              <Image src={c.image} alt="" fill sizes="180px" className="object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                            )}
                          </span>
                          <span className="mt-2 block text-center text-sm font-bold text-forest-900">{c.label}</span>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <ul className="flex-1 divide-y divide-forest-900/10 overflow-y-auto px-5">
                    <AnimatePresence initial={false}>
                      {lines.map((line) => {
                        const pot = planters.find((p) => p.id === line.planter);
                        const size = line.product.variants.length > 1 ? line.variantInfo : undefined;
                        return (
                          <motion.li
                            key={line.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                            transition={{ duration: 0.3, ease: curve }}
                            className="flex gap-4 overflow-hidden py-4"
                          >
                            <Link
                              href={`/shop/${line.slug}`}
                              onClick={closeCart}
                              className="relative aspect-[5/7] w-20 shrink-0 overflow-hidden rounded-[10px] bg-card"
                            >
                              <Image src={line.product.image} alt={line.product.imageAlt} fill sizes="80px" className="object-cover mix-blend-multiply" />
                            </Link>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <Link href={`/shop/${line.slug}`} onClick={closeCart} className="block text-[0.92rem] leading-tight font-bold text-forest-900 hover:underline">
                                    {line.product.name}
                                  </Link>
                                  <p className="mt-1 text-xs text-moss">
                                    {[size?.label, line.product.potOptions ? pot?.label : null].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-forest-900">{formatPrice(line.unit * line.quantity)}</p>
                              </div>
                              <div className="mt-auto flex items-center justify-between pt-3">
                                <div className="flex items-center rounded-full border border-forest-900/20 bg-card">
                                  <button
                                    type="button"
                                    onClick={() => storeActions.setQuantity(line.id, line.quantity - 1)}
                                    aria-label={line.quantity === 1 ? `Remove ${line.product.name}` : `Decrease quantity of ${line.product.name}`}
                                    className="grid size-8 place-items-center rounded-full text-forest-900 hover:bg-sage-100"
                                  >
                                    <Minus className="size-3.5" aria-hidden />
                                  </button>
                                  <motion.span
                                    key={line.quantity}
                                    initial={{ y: -6, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="w-6 text-center text-sm font-semibold tabular-nums"
                                    aria-live="polite"
                                  >
                                    <span className="sr-only">Quantity </span>
                                    {line.quantity}
                                  </motion.span>
                                  <button
                                    type="button"
                                    onClick={() => storeActions.setQuantity(line.id, line.quantity + 1)}
                                    disabled={line.quantity >= Math.min(MAX_QUANTITY, line.variantInfo?.stock ?? MAX_QUANTITY)}
                                    aria-label={`Increase quantity of ${line.product.name}`}
                                    className="grid size-8 place-items-center rounded-full text-forest-900 hover:bg-sage-100 disabled:opacity-40"
                                  >
                                    <Plus className="size-3.5" aria-hidden />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => storeActions.remove(line.id)}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-moss underline-offset-2 hover:text-clay hover:underline"
                                >
                                  <Trash2 className="size-3.5" aria-hidden /> Remove
                                </button>
                              </div>
                            </div>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>

                    {showUpsell && upsell && (
                      <li className="py-5">
                        <p className="mb-3 text-[0.8rem] font-bold text-forest-900">Pairs well with</p>
                        <div className="flex items-center gap-3 rounded-[12px] bg-card p-3">
                          <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-card">
                            <Image src={upsell.image} alt="" fill sizes="56px" className="object-cover" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-forest-900">{upsell.name}</p>
                            <p className="text-xs text-moss">{formatPrice(upsell.price)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => storeActions.addToCart(upsell.slug)}
                            className="nav-caps rounded-full border border-forest-900 px-3 py-2 text-forest-900 transition-colors hover:bg-forest-900 hover:text-ivory"
                          >
                            Add
                          </button>
                        </div>
                      </li>
                    )}
                  </ul>

                  <div className="border-t border-forest-900/10 bg-card px-5 py-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-forest-900">Subtotal</span>
                      <span className="text-lg font-semibold text-forest-900">{formatPrice(subtotal)}</span>
                    </div>
                    <p className="mt-1 text-xs text-moss">Delivery and taxes calculated at checkout.</p>
                    <Link href="/checkout" onClick={closeCart} className="btn btn-primary mt-4 w-full">
                      Check out
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
