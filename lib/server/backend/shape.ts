import "server-only";
import type { CatalogProduct, Planter, Variant } from "@/lib/domain";
import type { CareLevel, CategoryId, Light, Size, SizeOption, Tag } from "@/lib/products";

/** Raw product fields as stored (both backends). */
export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  botanical: string;
  categoryIds: string[];
  tags: string[];
  light: Light;
  care: CareLevel;
  size: Size;
  height: string;
  water: string;
  petFriendly: boolean;
  allowsPlanter: boolean;
  shortDescription: string;
  description: string;
  careNotes: string[];
  isActive: boolean;
  position: number;
  images: { url: string; alt: string; storagePath: string | null; position: number }[];
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1485955900006-10f4d324d411";

/**
 * Builds the storefront product from stored rows. Price, compare-at price and
 * size options are derived from the variants, so the database is the single
 * source of truth for pricing and stock.
 */
export function toCatalogProduct(row: ProductRow, allVariants: Variant[]): CatalogProduct {
  const variants = [...allVariants].sort((a, b) => a.position - b.position);
  const active = variants.filter((v) => v.isActive);
  const def = active.find((v) => v.isDefault) ?? active[0] ?? variants[0];
  const images = [...row.images].sort((a, b) => a.position - b.position);
  const primary = images[0] ?? { url: FALLBACK_IMAGE, alt: row.name };
  const base = def?.price ?? 0;
  const sized = active.length > 1 || (active.length === 1 && active[0].code !== "standard");
  const sizeOptions: SizeOption[] | undefined = sized
    ? active.map((v) => ({ id: v.code, label: v.label, detail: v.detail, priceDelta: v.price - base }))
    : undefined;
  const minPrice = active.length ? Math.min(...active.map((v) => v.price)) : base;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    botanical: row.botanical,
    categories: row.categoryIds as CategoryId[],
    tags: row.tags as Tag[],
    price: minPrice,
    compareAtPrice: def?.compareAtPrice ?? undefined,
    image: primary.url,
    imageAlt: primary.alt,
    gallery: images.slice(1).map((i) => ({ src: i.url, alt: i.alt })),
    light: row.light,
    care: row.care,
    size: row.size,
    height: row.height,
    water: row.water,
    petFriendly: row.petFriendly,
    potOptions: row.allowsPlanter,
    sizeOptions,
    shortDescription: row.shortDescription,
    description: row.description,
    careNotes: row.careNotes,
    variants,
    stock: active.reduce((s, v) => s + Math.max(0, v.stock), 0),
    isActive: row.isActive,
  };
}

export const sortPlanters = (p: Planter[]) => [...p].sort((a, b) => a.position - b.position);
