import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { ActiveToggle } from "@/components/admin/active-toggle";
import {
  AdminPageHeader,
  AdminSkeleton,
  EmptyState,
  Pill,
  inputCls,
  tableCls,
  tbodyCls,
  tdCls,
  thCls,
  theadCls,
  trCls,
} from "@/components/admin/ui";
import { cn, formatPrice } from "@/lib/format";
import { requireAdminPage } from "@/lib/server/auth";
import { getFreshCatalog } from "@/lib/server/catalog";

export const metadata = { title: "Products" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Hidden" },
  { id: "low", label: "Low stock" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminSkeleton rows={10} />}>
      <ProductsList searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function ProductsList({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const filterRaw = one(sp.filter);
  const filter: FilterId = FILTERS.some((f) => f.id === filterRaw) ? (filterRaw as FilterId) : "all";

  const catalog = await getFreshCatalog(true);
  const categoryName = new Map(catalog.categories.map((c) => [c.id as string, c.short]));
  const needle = q.toLowerCase();

  const rows = catalog.products
    .map((p) => {
      const active = p.variants.filter((v) => v.isActive);
      const prices = active.map((v) => v.price);
      const low = active.some((v) => v.stock <= v.lowStockThreshold);
      return { p, min: prices.length ? Math.min(...prices) : null, max: prices.length ? Math.max(...prices) : null, low };
    })
    .filter(({ p }) => !needle || p.name.toLowerCase().includes(needle) || p.slug.includes(needle) || p.botanical.toLowerCase().includes(needle))
    .filter(({ p, low }) => (filter === "active" ? p.isActive : filter === "inactive" ? !p.isActive : filter === "low" ? low : true));

  const href = (f: FilterId) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f !== "all") params.set("filter", f);
    const s = params.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={`${catalog.products.length} products · ${catalog.products.filter((p) => p.isActive).length} visible in the store`}
        actions={
          <Link href="/admin/products/new" className="btn btn-primary !px-4 !py-2 text-sm">
            Add product
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form role="search" action="/admin/products" className="relative w-full sm:max-w-xs">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-moss" aria-hidden />
          <input id="product-search" name="q" type="search" defaultValue={q} placeholder="Search name, slug or botanical" className={cn(inputCls, "pl-9")} />
        </form>
        <nav aria-label="Filter products" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href(f.id)}
              aria-current={filter === f.id ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                filter === f.id ? "border-forest-800 bg-forest-800 text-ivory" : "border-oat bg-card text-forest-800 hover:bg-sage-100",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No products match">Try a different search or filter.</EmptyState>
      ) : (
        <div className="md:rounded-2xl md:border md:border-sand md:bg-card">
          <table className={tableCls}>
            <caption className="sr-only">Products ({rows.length})</caption>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Product</th>
                <th className={thCls}>Categories</th>
                <th className={thCls}>Price</th>
                <th className={thCls}>Stock</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {rows.map(({ p, min, max, low }) => (
                <tr key={p.id} className={trCls}>
                  <td className={cn(tdCls, "before:content-none")}>
                    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Image src={p.image} alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg bg-cream object-cover" />
                      <div className="min-w-0">
                        <Link href={`/admin/products/${p.id}`} className="block truncate font-semibold text-forest-900 underline-offset-4 hover:underline">
                          {p.name}
                        </Link>
                        <span className="block truncate text-xs text-moss">/{p.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls} data-label="Categories">
                    <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                      {p.categories.map((c) => (
                        <Pill key={c} tone="muted">
                          {categoryName.get(c) ?? c}
                        </Pill>
                      ))}
                    </span>
                  </td>
                  <td className={tdCls} data-label="Price">
                    <span className="tabular-nums">{min === null ? "—" : min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max ?? min)}`}</span>
                  </td>
                  <td className={tdCls} data-label="Stock">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      {p.stock}
                      {p.stock === 0 ? <Pill tone="warn">Out of stock</Pill> : low ? <Pill tone="warn">Low</Pill> : null}
                    </span>
                  </td>
                  <td className={tdCls} data-label="Status">
                    <ActiveToggle productId={p.id} active={p.isActive} name={p.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
