import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Catalog } from "@/lib/domain";
import { getBackend } from "./backend";

export const CATALOG_TAG = "catalog";

/**
 * Cached storefront catalogue (active products only). Prices and stock come
 * from the database; admin mutations call updateTag(CATALOG_TAG).
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const backend = await getBackend();
  return backend.getCatalog();
}

/** Uncached read for pricing, checkout and admin — always current. */
export async function getFreshCatalog(includeInactive = false): Promise<Catalog> {
  const backend = await getBackend();
  return backend.getCatalog({ includeInactive });
}
