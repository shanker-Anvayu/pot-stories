"use client";

import { motion } from "framer-motion";
import { useCatalog, stockState } from "@/components/providers/catalog-provider";
import type { CatalogProduct } from "@/lib/domain";
import { cn, formatPrice } from "@/lib/format";

interface VariantPickerProps {
  product: CatalogProduct;
  variant: string;
  onVariantChange: (code: string) => void;
  planter: string | null;
  onPlanterChange: (id: string) => void;
  idPrefix: string;
  compact?: boolean;
}

/** Size (database variants, with live stock) + planter (database add-ons) selection. */
export function VariantPicker({ product, variant, onVariantChange, planter, onPlanterChange, idPrefix, compact }: VariantPickerProps) {
  const { planters } = useCatalog();
  const variants = product.variants.filter((v) => v.isActive).sort((a, b) => a.position - b.position);
  const current = variants.find((v) => v.code === variant);
  const base = variants.find((v) => v.isDefault)?.price ?? variants[0]?.price ?? product.price;
  const currentPlanter = planters.find((p) => p.id === planter);
  const showSizes = variants.length > 1;

  return (
    <div className="space-y-6">
      {showSizes && (
        <fieldset>
          <legend className="mb-3 text-sm text-forest-900">
            <span className="font-bold">Size:</span> {current?.label}
            {current && <span className="text-moss"> · {current.detail}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const selected = v.code === variant;
              const soldOut = v.stock <= 0;
              const delta = v.price - base;
              return (
                <label key={v.code} className={cn("relative", soldOut ? "cursor-not-allowed" : "cursor-pointer")}>
                  <input
                    type="radio"
                    name={`${idPrefix}-size`}
                    value={v.code}
                    checked={selected}
                    disabled={soldOut}
                    onChange={() => onVariantChange(v.code)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-clay peer-focus-visible:ring-offset-2",
                      selected ? "border-forest-900 text-ivory" : "border-forest-900/25 bg-card text-forest-900 hover:border-forest-900",
                      soldOut && "border-dashed text-moss/60 line-through hover:border-forest-900/25",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId={`${idPrefix}-size-pill`}
                        className="absolute inset-0 -z-0 bg-forest-900"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{v.label}</span>
                    {delta !== 0 && !soldOut && (
                      <span className={cn("relative text-xs font-medium", selected ? "text-sage-200" : "text-moss")}>
                        {delta > 0 ? "+" : "−"}
                        {formatPrice(Math.abs(delta))}
                      </span>
                    )}
                    {soldOut && <span className="relative text-[0.65rem] font-bold no-underline">Sold out</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {current && (
        <p
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold",
            stockState(current.stock, current.lowStockThreshold).tone === "out"
              ? "text-clay-dark"
              : stockState(current.stock, current.lowStockThreshold).tone === "low"
                ? "text-clay"
                : "text-forest-700",
          )}
          aria-live="polite"
        >
          <span
            className={cn(
              "size-2 rounded-full",
              current.stock <= 0 ? "bg-clay-dark" : current.stock <= current.lowStockThreshold ? "bg-clay" : "bg-sage-500",
            )}
            aria-hidden
          />
          {stockState(current.stock, current.lowStockThreshold).label}
        </p>
      )}

      {product.potOptions && planters.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm text-forest-900">
            <span className="font-bold">Planter:</span> {currentPlanter?.label}
          </legend>
          <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3")}>
            {planters.map((option) => {
              const selected = planter === option.id;
              return (
                <label key={option.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`${idPrefix}-pot`}
                    value={option.id}
                    checked={selected}
                    onChange={() => onPlanterChange(option.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-full items-center gap-2.5 rounded-xl border p-3 transition-[border-color,background-color,box-shadow] duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-clay",
                      compact && "flex-col items-start gap-1.5",
                      selected ? "border-forest-900 bg-sage-50 ring-1 ring-forest-900" : "border-forest-900/20 bg-card hover:border-forest-900/60",
                    )}
                  >
                    <span className="size-5 shrink-0 rounded-full border border-forest-900/20" style={{ backgroundColor: option.swatch }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[0.82rem] leading-tight font-bold text-forest-900">{option.label}</span>
                      <span className="block text-xs text-moss">{option.price === 0 ? "Included" : `+ ${formatPrice(option.price)}`}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
