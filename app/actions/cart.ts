"use server";

import type { ActionResult, CartLineInput } from "@/lib/domain";
import { getBackend } from "@/lib/server/backend";
import { AuthError, requireUser } from "@/lib/server/auth";
import { getFreshCatalog } from "@/lib/server/catalog";
import { MAX_LINE_QTY, sanitizeLines } from "@/lib/server/pricing";

/** Keeps only lines that exist in the current catalogue, clamped to stock. */
async function canonical(lines: CartLineInput[]): Promise<CartLineInput[]> {
  const catalog = await getFreshCatalog();
  const out: CartLineInput[] = [];
  for (const line of lines) {
    const product = catalog.products.find((p) => p.slug === line.slug);
    const variant = product?.variants.find((v) => v.code === line.variant && v.isActive);
    if (!product || !variant || variant.stock <= 0) continue;
    const planter = product.potOptions ? (catalog.planters.find((p) => p.id === line.planter && p.isActive)?.id ?? "grower") : null;
    const used = out.filter((l) => l.slug === line.slug && l.variant === line.variant).reduce((s, l) => s + l.quantity, 0);
    const quantity = Math.min(line.quantity, MAX_LINE_QTY, variant.stock - used);
    if (quantity > 0) out.push({ slug: line.slug, variant: variant.code, planter, quantity });
  }
  return out;
}

const fail = (err: unknown): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof AuthError ? err.message : "Something went wrong syncing your bag.",
});

/** Called after sign-in: merges the guest (browser) cart into the saved cart. */
export async function mergeCart(localLines: unknown): Promise<ActionResult<CartLineInput[]>> {
  try {
    const user = await requireUser();
    const backend = await getBackend();
    const saved = await backend.getCart(user.id);
    const merged = await canonical(sanitizeLines([...saved, ...sanitizeLines(localLines)]));
    await backend.replaceCart(user.id, merged);
    return { ok: true, data: merged };
  } catch (err) {
    return fail(err);
  }
}

/** Mirrors the signed-in user's cart to the database. */
export async function syncCart(lines: unknown): Promise<ActionResult<CartLineInput[]>> {
  try {
    const user = await requireUser();
    const backend = await getBackend();
    const clean = await canonical(sanitizeLines(lines));
    await backend.replaceCart(user.id, clean);
    return { ok: true, data: clean };
  } catch (err) {
    return fail(err);
  }
}

function cleanSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,120}$/.test(s)))).slice(0, 200);
}

export async function mergeWishlist(localSlugs: unknown): Promise<ActionResult<string[]>> {
  try {
    const user = await requireUser();
    const backend = await getBackend();
    const catalog = await getFreshCatalog();
    const known = new Set(catalog.products.map((p) => p.slug));
    const merged = Array.from(new Set([...(await backend.getWishlist(user.id)), ...cleanSlugs(localSlugs)])).filter((s) => known.has(s));
    await backend.replaceWishlist(user.id, merged);
    return { ok: true, data: merged };
  } catch (err) {
    return fail(err);
  }
}

export async function syncWishlist(slugs: unknown): Promise<ActionResult<string[]>> {
  try {
    const user = await requireUser();
    const backend = await getBackend();
    const catalog = await getFreshCatalog();
    const known = new Set(catalog.products.map((p) => p.slug));
    const clean = cleanSlugs(slugs).filter((s) => known.has(s));
    await backend.replaceWishlist(user.id, clean);
    return { ok: true, data: clean };
  } catch (err) {
    return fail(err);
  }
}
