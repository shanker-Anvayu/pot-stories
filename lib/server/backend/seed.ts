import "server-only";
import { categories, potOptions, products } from "@/lib/products";
import type { DiscountCode, Planter, Variant } from "@/lib/domain";
import type { ProductRow } from "./shape";

/**
 * Demo seed derived from lib/products.ts. Mirrors supabase/seed.sql exactly:
 * - sizeOptions become variants (price = base + delta); otherwise one "standard" variant
 * - compare-at price on the default variant only
 * - stock 18, except a few deliberately low/out-of-stock variants for the demo
 */

const STOCK_OVERRIDES: Record<string, number> = {
  "monstera-deliciosa/large": 4,
  "fiddle-leaf-fig/tall": 2,
  "juniper-bonsai/standard": 3,
  "boxwood-topiary/standard": 0,
};

export interface SeedData {
  productRows: ProductRow[];
  variants: (Variant & { productId: string })[];
  planters: Planter[];
  discountCodes: DiscountCode[];
}

export function buildSeed(): SeedData {
  const productRows: ProductRow[] = [];
  const variants: (Variant & { productId: string })[] = [];

  products.forEach((p, index) => {
    const id = `prod_${p.slug}`;
    productRows.push({
      id,
      slug: p.slug,
      name: p.name,
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
      isActive: true,
      position: index,
      images: [{ url: p.image, alt: p.imageAlt }, ...p.gallery.map((g) => ({ url: g.src, alt: g.alt }))].map((img, i) => ({
        ...img,
        storagePath: null,
        position: i,
      })),
    });

    const options = p.sizeOptions?.length
      ? p.sizeOptions.map((o) => ({ code: o.id, label: o.label, detail: o.detail, price: p.price + o.priceDelta }))
      : [{ code: "standard", label: "Standard", detail: p.height, price: p.price }];

    options.forEach((o, i) => {
      variants.push({
        id: `var_${p.slug}__${o.code}`,
        productId: id,
        code: o.code,
        sku: `PS-${p.slug.toUpperCase()}-${o.code.toUpperCase()}`,
        label: o.label,
        detail: o.detail,
        price: o.price,
        compareAtPrice: i === 0 ? (p.compareAtPrice ?? null) : null,
        stock: STOCK_OVERRIDES[`${p.slug}/${o.code}`] ?? 18,
        lowStockThreshold: 5,
        isDefault: i === 0,
        isActive: true,
        position: i,
      });
    });
  });

  const planters: Planter[] = potOptions.map((p, i) => ({
    id: p.id,
    label: p.label,
    note: p.note,
    price: p.price,
    swatch: p.swatch,
    position: i,
    isActive: true,
  }));

  const discountCodes: DiscountCode[] = [
    {
      code: "DEMO10",
      kind: "percent",
      value: 10,
      minSubtotal: 0,
      maxRedemptions: null,
      redemptions: 0,
      startsAt: null,
      endsAt: null,
      isActive: true,
      description: "Demo code for this preview — 10% off",
    },
  ];

  return { productRows, variants, planters, discountCodes };
}

export const seedCategories = () => categories.map((c) => ({ ...c }));
