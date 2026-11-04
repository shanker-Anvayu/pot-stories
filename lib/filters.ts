import type { CareLevel, Category, CategoryId, Light, Product, Size, Tag } from "./products";
import { searchProducts } from "./search";

export const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name: A–Z" },
] as const;
export type SortId = (typeof sortOptions)[number]["id"];

export const priceBuckets = [
  { id: "under-500", label: "Under ₹500", min: 0, max: 499 },
  { id: "500-1000", label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { id: "1000-2000", label: "₹1,000 – ₹2,000", min: 1001, max: 2000 },
  { id: "over-2000", label: "Over ₹2,000", min: 2001, max: Infinity },
] as const;
export type PriceId = (typeof priceBuckets)[number]["id"];

export interface Filters {
  category: CategoryId | null;
  tags: Tag[];
  light: Light[];
  care: CareLevel[];
  size: Size[];
  price: PriceId | null;
  sort: SortId;
  q: string;
}

const TAGS: Tag[] = ["bestseller", "new", "pet-friendly", "low-light", "beginner", "flowering", "statement", "gift", "festive"];
const LIGHTS: Light[] = ["low", "medium", "bright"];
const CARES: CareLevel[] = ["easy", "moderate", "expert"];
const SIZES: Size[] = ["small", "medium", "large"];

function list<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return [];
  return value.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function parseFilters(params: URLSearchParams, categories: Pick<Category, "id">[]): Filters {
  const category = params.get("category");
  const sort = params.get("sort");
  const price = params.get("price");
  return {
    category: categories.some((c) => c.id === category) ? (category as CategoryId) : null,
    tags: list(params.get("tags"), TAGS),
    light: list(params.get("light"), LIGHTS),
    care: list(params.get("care"), CARES),
    size: list(params.get("size"), SIZES),
    price: priceBuckets.some((b) => b.id === price) ? (price as PriceId) : null,
    sort: sortOptions.some((s) => s.id === sort) ? (sort as SortId) : "featured",
    q: (params.get("q") ?? "").slice(0, 80),
  };
}

export function serializeFilters(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.category) params.set("category", f.category);
  if (f.tags.length) params.set("tags", f.tags.join(","));
  if (f.light.length) params.set("light", f.light.join(","));
  if (f.care.length) params.set("care", f.care.join(","));
  if (f.size.length) params.set("size", f.size.join(","));
  if (f.price) params.set("price", f.price);
  if (f.sort !== "featured") params.set("sort", f.sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: Filters) {
  return f.tags.length + f.light.length + f.care.length + f.size.length + (f.price ? 1 : 0);
}

export function applyFilters<T extends Product>(f: Filters, products: T[]): T[] {
  const bucket = priceBuckets.find((b) => b.id === f.price);
  const filtered = searchProducts(f.q, products).filter(
    (p) =>
      (!f.category || p.categories.includes(f.category)) &&
      f.tags.every((t) => p.tags.includes(t)) &&
      (f.light.length === 0 || f.light.includes(p.light)) &&
      (f.care.length === 0 || f.care.includes(p.care)) &&
      (f.size.length === 0 || f.size.includes(p.size)) &&
      (!bucket || (p.price >= bucket.min && p.price <= bucket.max)),
  );

  const order = new Map(products.map((p, i) => [p.slug, i]));
  const sorted = [...filtered];
  switch (f.sort) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      sorted.sort((a, b) => Number(b.tags.includes("new")) - Number(a.tags.includes("new")) || (order.get(b.slug) ?? 0) - (order.get(a.slug) ?? 0));
      break;
    default:
      sorted.sort((a, b) => Number(b.tags.includes("bestseller")) - Number(a.tags.includes("bestseller")) || (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  }
  return sorted;
}
