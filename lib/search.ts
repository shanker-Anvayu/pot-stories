import type { Product } from "./products";

/** Simple client-side search across names, botanical names, categories and needs. */
export function searchProducts<T extends Product>(query: string, source: T[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return source;
  const terms = q.split(/\s+/);
  return source.filter((p) => {
    const haystack = [
      p.name,
      p.botanical,
      p.shortDescription,
      ...p.categories,
      ...p.tags,
      `${p.light} light`,
      p.petFriendly ? "pet friendly pet safe" : "",
    ]
      .join(" ")
      .toLowerCase()
      .replace(/-/g, " ")
      .normalize("NFD")
      .replace(/[̀-ͯ‘’]/g, "");
    return terms.every((t) => haystack.includes(t));
  });
}
