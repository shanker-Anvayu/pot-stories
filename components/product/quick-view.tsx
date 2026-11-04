"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { useUI } from "@/components/providers/ui-provider";
import { useDialog } from "@/lib/use-dialog";
import { MAX_QUANTITY, linePrice } from "@/lib/store";
import { firstAvailableVariantCode, useCatalog, variantFor } from "@/components/providers/catalog-provider";
import type { CatalogProduct } from "@/lib/domain";
import { formatPrice } from "@/lib/format";
import { VariantPicker } from "./variant-picker";
import { useAddToCart } from "./use-add-to-cart";

function QuickViewBody({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const { planters } = useCatalog();
  const [variant, setVariant] = useState<string>(firstAvailableVariantCode(product));
  const [planter, setPlanter] = useState<string | null>(product.potOptions ? (planters[0]?.id ?? null) : null);
  const soldOut = (variantFor(product, variant)?.stock ?? 0) <= 0;
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();
  const unit = linePrice(product, variant, planter);

  return (
    <div className="grid max-h-[88svh] overflow-y-auto sm:grid-cols-[0.9fr_1.1fr]">
      <div className="relative hidden aspect-[5/7] bg-card sm:block">
        <Image src={product.image} alt={product.imageAlt} fill sizes="380px" className="object-cover mix-blend-multiply" />
      </div>
      <div className="flex flex-col p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-card sm:hidden">
            <Image src={product.image} alt="" fill sizes="80px" className="object-cover mix-blend-multiply" />
          </span>
          <div className="min-w-0">
            <h2 id="quick-view-title" className="display-heavy text-[1.7rem] text-forest-900">
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-moss italic">{product.botanical}</p>
            <p className="mt-3 text-xl font-semibold text-forest-900">{formatPrice(unit)}</p>
          </div>
        </div>

        <div className="mt-6">
          <VariantPicker product={product} variant={variant} onVariantChange={setVariant} planter={planter} onPlanterChange={setPlanter} idPrefix="qv" compact />
        </div>

        <div className="mt-7 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-forest-900/25">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="grid size-11 place-items-center rounded-full hover:bg-sage-100 disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
              <span className="sr-only">Quantity </span>
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              aria-label="Increase quantity"
              className="grid size-11 place-items-center rounded-full hover:bg-sage-100"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => {
              if (addToCart(product.slug, { variant, planter, quantity })) onClose();
            }}
            className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {soldOut ? "Sold out" : <>Add to bag · {formatPrice(unit * quantity)}</>}
          </button>
        </div>
        <Link
          href={`/shop/${product.slug}`}
          onClick={onClose}
          className="group mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-forest-800 underline-offset-4 hover:underline"
        >
          View full details <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function QuickView() {
  const { quickViewSlug, closeQuickView } = useUI();
  const { bySlug } = useCatalog();
  const panelRef = useRef<HTMLDivElement>(null);
  const product = quickViewSlug ? bySlug(quickViewSlug) : undefined;
  useDialog(!!product, closeQuickView, panelRef);

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-forest-950/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeQuickView}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-title"
            initial={{ opacity: 0, scale: 0.97, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: [0.165, 0.84, 0.44, 1] }}
            className="relative w-full max-w-3xl overflow-hidden rounded-t-[22px] bg-ivory shadow-2xl sm:rounded-[22px]"
          >
            <button
              type="button"
              onClick={closeQuickView}
              aria-label="Close quick view"
              className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-ivory/90 text-forest-900 hover:bg-sage-100"
            >
              <X className="size-5" aria-hidden />
            </button>
            <QuickViewBody key={product.slug} product={product} onClose={closeQuickView} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
