import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/product-detail";
import { RelatedProducts } from "@/components/product/related-products";
import { relatedProducts } from "@/lib/products";
import { getCatalog } from "@/lib/server/catalog";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCatalog()).products.find((p) => p.slug === slug);
  if (!product) return { title: "Plant not found" };
  return { title: product.name, description: `${product.shortDescription} ${product.description}`.slice(0, 160) };
}

async function ProductContent({ params }: { params: PageProps<"/shop/[slug]">["params"] }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const products = catalog.products;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  const category = catalog.categories.find((c) => c.id === product.categories[0]);
  const related = relatedProducts(product, 5, products);
  const productsBySlugs = (slugs: string[]) => products.filter((p) => slugs.includes(p.slug));
  // Pairings: care kits plus small companions that suit the same light.
  const pairs = [
    ...productsBySlugs(["essential-repotting-kit", "heirloom-seed-starter-kit"]),
    ...products.filter((p) => p.size === "small" && p.light === product.light && !related.includes(p)),
  ]
    .filter((p) => p.slug !== product.slug)
    .slice(0, 5);

  return (
    <>
      <div className="container-page pt-6 pb-10 sm:pt-8 sm:pb-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-moss sm:text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-forest-900">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/shop" className="hover:text-forest-900">
                Shop
              </Link>
            </li>
            {category && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={`/shop?category=${category.id}`} className="hover:text-forest-900">
                    {category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-forest-900">
              {product.name}
            </li>
          </ol>
        </nav>
        <ProductDetail product={product} />
      </div>
      <RelatedProducts id="pairs" title="Pairs well with" products={pairs} />
      <RelatedProducts id="related" title="You may also like" products={related} />
    </>
  );
}

/** Params are read inside Suspense so the route's App Shell stays instant and URL-independent. */
export default function Page({ params }: PageProps<"/shop/[slug]">) {
  return (
    <Suspense fallback={<div aria-hidden className="container-page py-10"><div className="aspect-[5/7] max-w-xl animate-pulse rounded-[14px] bg-card sm:aspect-[16/9] sm:max-w-none" /></div>}>
      <ProductContent params={params} />
    </Suspense>
  );
}
