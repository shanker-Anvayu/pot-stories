"use client";

import { ProductRail } from "@/components/product/product-rail";
import { useCatalog } from "@/components/providers/catalog-provider";

export function BestsellersRail() {
  const { products, byTag: productsByTag } = useCatalog();
  // Two full desktop rows: bestsellers first, topped up with beginner favourites.
  const best = productsByTag("bestseller");
  const extra = products.filter((p) => !best.includes(p) && p.tags.includes("beginner"));
  return (
    <ProductRail
      id="bestsellers"
      eyebrow="Most loved"
      title={
        <>
          Bestselling <span className="text-forest-600 italic">plants</span>
        </>
      }
      products={[...best, ...extra].slice(0, 10)}
      layout="grid"
      viewAll={{ href: "/shop?tags=bestseller", label: "Shop all bestsellers" }}
      className="pt-14 pb-16 sm:pt-20 sm:pb-24"
    />
  );
}

export function NewArrivalsRail() {
  const { byTag: productsByTag } = useCatalog();
  return (
    <ProductRail
      id="new-arrivals"
      eyebrow="Just landed"
      title={
        <>
          New <span className="text-forest-600 italic">arrivals</span>
        </>
      }
      description="Fresh faces for the shelf — recently added to the collection."
      products={productsByTag("new").slice(0, 5)}
      badge={() => "New!"}
      viewAll={{ href: "/shop?tags=new", label: "See what's new" }}
      className="py-14 sm:py-20"
    />
  );
}
