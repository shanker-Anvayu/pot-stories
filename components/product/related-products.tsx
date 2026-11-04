"use client";

import { ProductRail } from "./product-rail";
import type { CatalogProduct as Product } from "@/lib/domain";

/** Recommendation strip used on product and journal pages. */
export function RelatedProducts({
  products,
  title = "You may also like",
  id = "related",
}: {
  products: Product[];
  eyebrow?: string;
  title?: string;
  id?: string;
}) {
  if (products.length === 0) return null;
  return <ProductRail id={id} title={title} products={products.slice(0, 5)} viewAll={{ href: "/shop", label: "Shop all plants" }} />;
}
