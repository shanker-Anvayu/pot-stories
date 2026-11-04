"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { FilterPanel } from "./filter-panel";
import { useDialog } from "@/lib/use-dialog";
import {
  activeFilterCount,
  applyFilters,
  parseFilters,
  priceBuckets,
  serializeFilters,
  sortOptions,
  type Filters,
  type SortId,
} from "@/lib/filters";
import { careLabel, lightLabel, sizeLabel, tagLabel } from "@/lib/products";
import { useCatalog } from "@/components/providers/catalog-provider";
import { cn } from "@/lib/format";

export function ShopView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { products, categories } = useCatalog();
  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString()), categories), [searchParams, categories]);
  const results = useMemo(() => applyFilters(filters, products), [filters, products]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useDialog(drawerOpen, closeDrawer, drawerRef);

  const update = useCallback(
    (next: Partial<Filters>) => {
      router.replace(`${pathname}${serializeFilters({ ...filters, ...next })}`, { scroll: false });
    },
    [filters, pathname, router],
  );

  const category = categories.find((c) => c.id === filters.category);
  const count = activeFilterCount(filters);
  const title = filters.q ? `Results for “${filters.q}”` : (category?.name ?? "All plants");
  const description = filters.q
    ? `${results.length} ${results.length === 1 ? "plant matches" : "plants match"} your search.`
    : (category?.description ?? "Indoor greenery, outdoor favourites, sculptural succulents and everything in between.");

  const chips = [
    ...filters.tags.map((t) => ({ key: `tag-${t}`, label: tagLabel[t], clear: () => update({ tags: filters.tags.filter((x) => x !== t) }) })),
    ...filters.light.map((l) => ({ key: `light-${l}`, label: lightLabel[l], clear: () => update({ light: filters.light.filter((x) => x !== l) }) })),
    ...filters.care.map((c) => ({ key: `care-${c}`, label: careLabel[c], clear: () => update({ care: filters.care.filter((x) => x !== c) }) })),
    ...filters.size.map((s) => ({ key: `size-${s}`, label: sizeLabel[s], clear: () => update({ size: filters.size.filter((x) => x !== s) }) })),
    ...(filters.price
      ? [{ key: "price", label: priceBuckets.find((b) => b.id === filters.price)?.label ?? "", clear: () => update({ price: null }) }]
      : []),
  ];

  const clearAll = () => update({ tags: [], light: [], care: [], size: [], price: null, q: "" });

  return (
    <>
      {/* Page header */}
      <section className="border-b border-forest-900/10 bg-ivory">
        <div className="container-page pt-6 pb-6 sm:pt-8">
          <nav aria-label="Breadcrumb" className="text-xs text-moss sm:text-sm">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-forest-900">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                {category ? (
                  <Link href="/shop" className="hover:text-forest-900">
                    Shop
                  </Link>
                ) : (
                  <span aria-current="page" className="text-forest-900">
                    Shop
                  </span>
                )}
              </li>
              {category && (
                <>
                  <li aria-hidden>/</li>
                  <li aria-current="page" className="text-forest-900">
                    {category.name}
                  </li>
                </>
              )}
            </ol>
          </nav>
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="display-heavy mt-4 text-[clamp(2.1rem,4.6vw,3.4rem)] text-forest-900"
          >
            {title}
          </motion.h1>
          <p className="mt-2 max-w-xl text-sm text-moss sm:text-[0.95rem]">{description}</p>

          <nav aria-label="Categories" className="rail mt-6 gap-2 lg:mx-0 lg:flex-wrap lg:px-0">
            {[{ id: null, short: "All" }, ...categories.map((c) => ({ id: c.id, short: c.name }))].map((c) => {
              const active = filters.category === c.id;
              return (
                <button
                  key={c.id ?? "all"}
                  type="button"
                  onClick={() => update({ category: c.id })}
                  aria-pressed={active}
                  className={cn(
                    "nav-caps shrink-0 rounded-full border px-4 py-2.5 transition-colors duration-200",
                    active
                      ? "border-forest-800 bg-forest-800 text-ivory"
                      : "border-forest-900/20 bg-card text-forest-900 hover:border-forest-900",
                  )}
                >
                  {c.short}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[14rem_1fr] lg:gap-10 lg:py-10">
        {/* Desktop sidebar */}
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-40">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[1rem] font-bold text-forest-900">Filters</h2>
              {count > 0 && (
                <button type="button" onClick={clearAll} className="text-sm text-moss underline-offset-4 hover:text-forest-900 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel filters={filters} onChange={update} idPrefix="side" />
          </div>
        </aside>

        <div>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-forest-900/15 px-4 py-2.5 text-sm font-semibold text-forest-900 hover:border-forest-900/50 lg:hidden"
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                Filters
                {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-forest-800 text-[0.65rem] text-ivory">{count}</span>}
              </button>
              <p className="text-sm text-moss" aria-live="polite">
                <span className="font-semibold text-forest-900">{results.length}</span> {results.length === 1 ? "plant" : "plants"}
              </p>
            </div>
            <label className="relative inline-flex items-center gap-2 text-sm text-moss">
              <span className="hidden sm:inline">Sort by</span>
              <select
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as SortId })}
                className="appearance-none rounded-full border border-forest-900/15 bg-ivory py-2.5 pr-10 pl-4 font-semibold text-forest-900 hover:border-forest-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                aria-label="Sort plants"
              >
                {sortOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-forest-900" aria-hidden />
            </label>
          </div>

          {/* Active filters */}
          {(chips.length > 0 || filters.q) && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Active filters">
              {filters.q && (
                <li>
                  <button
                    type="button"
                    onClick={() => update({ q: "" })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-forest-800 px-3.5 py-1.5 text-xs font-semibold text-ivory"
                  >
                    <Search className="size-3" aria-hidden /> “{filters.q}” <X className="size-3" aria-hidden />
                    <span className="sr-only">Clear search</span>
                  </button>
                </li>
              )}
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={chip.clear}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3.5 py-1.5 text-xs font-semibold text-forest-800 hover:bg-sage-200"
                  >
                    {chip.label} <X className="size-3" aria-hidden />
                    <span className="sr-only">Remove filter</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={clearAll} className="px-2 py-1.5 text-xs font-semibold text-moss underline-offset-4 hover:underline">
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {/* Grid */}
          {results.length > 0 ? (
            <motion.ul layout className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {results.map((product, i) => (
                  <motion.li
                    key={product.slug}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.55, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ProductCard product={product} preload={i < 3} sizes="(min-width: 1280px) 19vw, (min-width: 768px) 30vw, 46vw" />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          ) : (
            <div className="mt-8 rounded-[16px] bg-card px-6 py-16 text-center">
              <p className="display-heavy text-3xl text-forest-900">No plants match just yet</p>
              <p className="mx-auto mt-3 max-w-md text-moss">Try removing a filter or two — or browse the full collection.</p>
              <button type="button" onClick={() => update({ category: null, tags: [], light: [], care: [], size: [], price: null, q: "" })} className="btn btn-primary mt-8">
                Show all plants
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              className="absolute inset-0 bg-forest-950/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              aria-hidden
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="filter-title"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.165, 0.84, 0.44, 1] }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-[22px] bg-ivory"
            >
              <div className="flex items-center justify-between border-b border-forest-900/10 px-6 py-4">
                <h2 id="filter-title" className="font-display text-2xl text-forest-900">
                  Filters
                </h2>
                <button type="button" onClick={closeDrawer} aria-label="Close filters" className="grid size-10 place-items-center rounded-full hover:bg-sage-100">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <FilterPanel filters={filters} onChange={update} idPrefix="drawer" />
              </div>
              <div className="flex gap-3 border-t border-forest-900/10 px-6 py-4">
                <button type="button" onClick={clearAll} className="btn btn-outline flex-1 text-forest-900">
                  Clear
                </button>
                <button type="button" onClick={closeDrawer} className="btn btn-primary flex-[2]">
                  Show {results.length} {results.length === 1 ? "plant" : "plants"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
