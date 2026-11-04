"use client";

import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from "react";
import type { Catalog, CatalogProduct, Planter, Variant } from "@/lib/domain";
import type { Category, Tag } from "@/lib/products";

/**
 * Client access to the database-backed catalogue snapshot rendered by the
 * root layout. Prices, variants, planters and stock all come from here.
 */

let currentCatalog: Catalog | null = null;
/** Non-React access for the cart store (set by the provider). */
export const getCatalogSnapshot = () => currentCatalog;

export interface CatalogApi {
  catalog: Catalog;
  products: CatalogProduct[];
  categories: Category[];
  planters: Planter[];
  bySlug: (slug: string) => CatalogProduct | undefined;
  byTag: (tag: Tag) => CatalogProduct[];
  bySlugs: (slugs: string[]) => CatalogProduct[];
}

const CatalogContext = createContext<CatalogApi | null>(null);

export function makeCatalogApi(catalog: Catalog): CatalogApi {
  const map = new Map(catalog.products.map((p) => [p.slug, p]));
  return {
    catalog,
    products: catalog.products,
    categories: catalog.categories,
    planters: catalog.planters,
    bySlug: (slug) => map.get(slug),
    byTag: (tag) => catalog.products.filter((p) => p.tags.includes(tag)),
    bySlugs: (slugs) => slugs.flatMap((s) => (map.has(s) ? [map.get(s)!] : [])),
  };
}

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  // Layout effects run before passive effects, so the cart store (which
  // subscribes in a passive effect) always sees the catalogue on first use.
  useLayoutEffect(() => {
    currentCatalog = catalog;
  }, [catalog]);
  const api = useMemo(() => makeCatalogApi(catalog), [catalog]);
  return <CatalogContext.Provider value={api}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogApi {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within <CatalogProvider>");
  return ctx;
}

/* ---- pure helpers usable anywhere ---- */

export function variantFor(product: CatalogProduct, code: string | null | undefined): Variant | undefined {
  const active = product.variants.filter((v) => v.isActive);
  return active.find((v) => v.code === code) ?? active.find((v) => v.isDefault) ?? active[0];
}

export function defaultVariantCode(product: CatalogProduct): string {
  return variantFor(product, null)?.code ?? "standard";
}

/** First variant with stock (falls back to default) — what quick add should pick. */
export function firstAvailableVariantCode(product: CatalogProduct): string {
  const active = product.variants.filter((v) => v.isActive).sort((a, b) => a.position - b.position);
  return (active.find((v) => v.stock > 0) ?? active[0])?.code ?? "standard";
}

export function unitPrice(product: CatalogProduct, variantCode: string | null, planterId: string | null, planters: Planter[]) {
  const v = variantFor(product, variantCode);
  const planter = product.potOptions && planterId ? planters.find((p) => p.id === planterId) : undefined;
  return (v?.price ?? product.price) + (planter?.price ?? 0);
}

export type StockState = { label: string; tone: "ok" | "low" | "out" };

export function stockState(stock: number, threshold = 5): StockState {
  if (stock <= 0) return { label: "Sold out", tone: "out" };
  if (stock <= threshold) return { label: `Only ${stock} left`, tone: "low" };
  return { label: "In stock", tone: "ok" };
}
