"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { useUI } from "@/components/providers/ui-provider";
import { searchProducts } from "@/lib/search";
import { tagLabel, type Tag } from "@/lib/products";
import { useCatalog } from "@/components/providers/catalog-provider";
import { formatPrice, cn } from "@/lib/format";

const popular = ["Monstera", "Snake plant", "Pet friendly", "Low light", "Bonsai", "Succulent"];
const ease = [0.18, 0.77, 0.58, 1] as const;

function useSearchSubmit() {
  const router = useRouter();
  const { closeSearch } = useUI();
  return (q: string) => {
    const value = q.trim();
    if (!value) return;
    closeSearch();
    router.push(`/shop?q=${encodeURIComponent(value)}`);
  };
}

/** Predictive results: products, suggestions and collections for the query. */
function SearchResults({ query, onPick, onNavigate }: { query: string; onPick: (q: string) => void; onNavigate: () => void }) {
  const { products: all, categories, byTag } = useCatalog();
  const deferred = useDeferredValue(query.trim());
  const products = useMemo(() => (deferred ? searchProducts(deferred, all).slice(0, 4) : byTag("bestseller").slice(0, 3)), [deferred, all, byTag]);
  const q = deferred.toLowerCase();
  const tagMatches = deferred
    ? (Object.keys(tagLabel) as Tag[]).filter((t) => tagLabel[t].toLowerCase().includes(q) || t.includes(q)).slice(0, 3)
    : [];
  const catMatches = deferred ? categories.filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q)).slice(0, 3) : [];

  return (
    <div className="max-h-[70svh] overflow-y-auto p-5" aria-live="polite">
      {!deferred && (
        <div className="mb-5">
          <p className="mb-2.5 text-[0.8rem] font-bold text-forest-900">Popular searches</p>
          <div className="flex flex-wrap gap-1.5">
            {popular.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPick(p)}
                className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-medium text-forest-900 transition-colors hover:border-forest-900 hover:bg-sage-100"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mb-2 text-[0.8rem] font-bold text-forest-900">{deferred ? "Products" : "Trending now"}</p>
      {products.length === 0 ? (
        <p className="py-3 text-sm text-moss">No plants match “{deferred}”. Try a name or a need like “low light”.</p>
      ) : (
        <ul className="divide-y divide-forest-900/8">
          {products.map((p) => (
            <li key={p.slug}>
              <Link href={`/shop/${p.slug}`} onClick={onNavigate} className="group flex gap-3 py-2.5">
                <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-card">
                  <Image src={p.image} alt="" fill sizes="48px" className="object-cover mix-blend-multiply" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-forest-900 group-hover:underline">{p.name}</span>
                  <span className="line-clamp-1 block text-xs text-moss">{p.shortDescription}</span>
                  <span className="mt-0.5 block text-xs text-forest-900">from {formatPrice(p.price)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(tagMatches.length > 0 || catMatches.length > 0) && (
        <>
          <p className="mt-4 mb-2 border-t border-forest-900/10 pt-4 text-[0.8rem] font-bold text-forest-900">Collections</p>
          <ul className="space-y-1">
            {catMatches.map((c) => (
              <li key={c.id}>
                <Link href={`/shop?category=${c.id}`} onClick={onNavigate} className="text-sm text-forest-800 hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
            {tagMatches.map((t) => (
              <li key={t}>
                <Link href={`/shop?tags=${t}`} onClick={onNavigate} className="text-sm text-forest-800 hover:underline">
                  {tagLabel[t]}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {deferred && (
        <Link
          href={`/shop?q=${encodeURIComponent(deferred)}`}
          onClick={onNavigate}
          className="group mt-4 flex items-center justify-center gap-1.5 border-t border-forest-900/10 pt-4 text-sm font-semibold text-forest-900"
        >
          Show all results for “{deferred}”
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** Desktop: inline search pill in the header with a predictive dropdown. */
export function DesktopSearch() {
  const { searchOpen, openSearch, closeSearch } = useUI();
  const [query, setQuery] = useState("");
  const submit = useSearchSubmit();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: PointerEvent) => {
      const wrap = wrapRef.current;
      // Hidden below lg (mobile search is in charge there).
      if (!wrap || wrap.offsetParent === null) return;
      if (!wrap.contains(e.target as Node)) closeSearch();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, closeSearch]);

  return (
    <div ref={wrapRef} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className={cn(
          "flex h-10 w-[22rem] items-center rounded-full border bg-card pr-1 pl-4 transition-[border-color,box-shadow] duration-200 xl:w-[25rem]",
          searchOpen ? "border-forest-900 shadow-[0_0_0_3px_rgba(20,40,29,0.08)]" : "border-forest-900/20 hover:border-forest-900/50",
        )}
      >
        <label htmlFor={inputId} className="sr-only">
          Search plants
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={openSearch}
          placeholder="Search plants, pots and care…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-forest-900 placeholder:text-moss/70 focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button type="submit" aria-label="Search" className="grid size-8 place-items-center rounded-full text-forest-900 hover:bg-sage-100">
          <Search className="size-4" aria-hidden />
        </button>
      </form>
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease }}
            className="absolute top-[calc(100%+0.6rem)] right-0 z-50 w-[27rem] overflow-hidden rounded-[14px] border border-forest-900/10 bg-card shadow-[0_24px_50px_-20px_rgba(14,29,21,0.45)]"
          >
            <SearchResults query={query} onPick={setQuery} onNavigate={closeSearch} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Mobile: search panel that drops down beneath the header row. */
export function MobileSearch() {
  const { searchOpen, closeSearch } = useUI();
  const [query, setQuery] = useState("");
  const submit = useSearchSubmit();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, closeSearch]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease }}
          className="absolute inset-x-0 top-full overflow-hidden border-t border-forest-900/10 bg-card shadow-lg lg:hidden"
        >
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
            className="flex items-center gap-2 border-b border-forest-900/10 px-4 py-3"
          >
            <Search className="size-5 text-forest-900" aria-hidden />
            <label htmlFor="mobile-search" className="sr-only">
              Search plants
            </label>
            <input
              ref={inputRef}
              id="mobile-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plants…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-base text-forest-900 placeholder:text-moss/60 focus:outline-none focus-visible:outline-none"
            />
            <button type="button" onClick={closeSearch} aria-label="Close search" className="grid size-9 place-items-center rounded-full hover:bg-sage-100">
              <X className="size-5" aria-hidden />
            </button>
          </form>
          <SearchResults query={query} onPick={setQuery} onNavigate={closeSearch} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Dims the page beneath the header while search is open. */
export function SearchScrim() {
  const { searchOpen, closeSearch } = useUI();
  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          aria-hidden
          onClick={closeSearch}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-30 bg-forest-950/45"
        />
      )}
    </AnimatePresence>
  );
}
