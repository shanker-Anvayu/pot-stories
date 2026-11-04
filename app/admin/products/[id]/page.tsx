import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { AdminPageHeader, AdminSkeleton, Pill } from "@/components/admin/ui";
import type { CatalogProduct } from "@/lib/domain";
import { requireAdminPage } from "@/lib/server/auth";
import { getFreshCatalog } from "@/lib/server/catalog";

export const metadata = { title: "Edit product" };

export default function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton rows={12} />}>
      <EditProduct params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function toFormValues(p: CatalogProduct): ProductFormValues {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    botanical: p.botanical,
    categoryIds: [...p.categories],
    tags: [...p.tags],
    light: p.light,
    care: p.care,
    size: p.size,
    height: p.height,
    water: p.water,
    petFriendly: p.petFriendly,
    allowsPlanter: p.potOptions,
    shortDescription: p.shortDescription,
    description: p.description,
    careNotes: [...p.careNotes],
    isActive: p.isActive,
    images: [{ url: p.image, alt: p.imageAlt }, ...p.gallery.map((g) => ({ url: g.src, alt: g.alt }))],
    variants: [...p.variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        id: v.id,
        code: v.code,
        label: v.label,
        detail: v.detail,
        price: String(v.price),
        compareAtPrice: v.compareAtPrice === null ? "" : String(v.compareAtPrice),
        stock: String(v.stock),
        lowStockThreshold: String(v.lowStockThreshold),
        isActive: v.isActive,
      })),
  };
}

async function EditProduct({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/products/[id]">["params"];
  searchParams: PageProps<"/admin/products/[id]">["searchParams"];
}) {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { products, categories } = await getFreshCatalog(true);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader
        title={product.name}
        back={{ href: "/admin/products", label: "Products" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {product.isActive ? <Pill tone="good">Active</Pill> : <Pill tone="muted">Hidden</Pill>}
            <span>{product.stock} in stock across active variants</span>
            {sp.created === "1" && <Pill>Created</Pill>}
          </span>
        }
        actions={
          product.isActive ? (
            <Link href={`/shop/${product.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-oat bg-card px-4 py-2 text-sm font-bold text-forest-800 hover:bg-sage-100">
              View in store <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          ) : undefined
        }
      />
      {/* key resets the form state after a save refreshes the data */}
      <ProductForm key={JSON.stringify(product.variants.map((v) => v.id))} initial={toFormValues(product)} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
