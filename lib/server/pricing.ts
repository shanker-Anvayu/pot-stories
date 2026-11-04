import "server-only";
import type { CartLineInput, Catalog, PricedLine, Quote, QuoteIssue } from "@/lib/domain";
import { getBackend } from "./backend";
import { getFreshCatalog } from "./catalog";
import { env } from "./env";

export const MAX_LINE_QTY = 20;
export const MAX_LINES = 50;

/** Validates untrusted cart input shape (identifiers + quantities only). */
export function sanitizeLines(input: unknown): CartLineInput[] {
  if (!Array.isArray(input)) return [];
  const merged = new Map<string, CartLineInput>();
  for (const raw of input.slice(0, MAX_LINES)) {
    if (!raw || typeof raw !== "object") continue;
    const { slug, variant, planter, quantity } = raw as Record<string, unknown>;
    if (typeof slug !== "string" || typeof variant !== "string") continue;
    if (planter !== null && planter !== undefined && typeof planter !== "string") continue;
    const qty = typeof quantity === "number" && Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    if (qty < 1) continue;
    const key = `${slug}:${variant}:${planter ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, {
      slug: slug.slice(0, 120),
      variant: variant.slice(0, 60),
      planter: typeof planter === "string" ? planter.slice(0, 40) : null,
      quantity: Math.min(MAX_LINE_QTY, (prev?.quantity ?? 0) + qty),
    });
  }
  return [...merged.values()];
}

export function deliveryFeeFor(subtotal: number) {
  if (subtotal <= 0) return 0;
  return subtotal >= env.freeDeliveryThreshold ? 0 : Math.max(0, env.deliveryFee);
}

/**
 * Re-prices a cart entirely on the server from current database values.
 * Client-supplied prices are never read.
 */
export async function quoteCart(rawLines: unknown, discountCode?: string | null, catalog?: Catalog): Promise<Quote> {
  const lines = sanitizeLines(rawLines);
  const cat = catalog ?? (await getFreshCatalog());
  const priced: PricedLine[] = [];
  const issues: QuoteIssue[] = [];

  for (const line of lines) {
    const product = cat.products.find((p) => p.slug === line.slug);
    const variant = product?.variants.find((v) => v.code === line.variant && v.isActive);
    if (!product || !product.isActive || !variant) {
      issues.push({ slug: line.slug, variant: line.variant, kind: "unavailable", message: "This item is no longer available." });
      continue;
    }
    let planterLabel: string | null = null;
    let planterPrice = 0;
    let planterId: string | null = null;
    if (product.potOptions && line.planter && line.planter !== "grower") {
      const planter = cat.planters.find((p) => p.id === line.planter && p.isActive);
      if (!planter) {
        issues.push({ slug: line.slug, variant: line.variant, kind: "planter_unavailable", message: "The selected planter is unavailable." });
        continue;
      }
      planterId = planter.id;
      planterLabel = planter.label;
      planterPrice = planter.price;
    } else if (product.potOptions) {
      const grower = cat.planters.find((p) => p.id === "grower");
      planterId = grower ? "grower" : null;
      planterLabel = grower?.label ?? null;
      planterPrice = grower?.price ?? 0;
    }

    if (variant.stock <= 0) {
      issues.push({ slug: line.slug, variant: line.variant, kind: "out_of_stock", message: `${product.name} (${variant.label}) is out of stock.`, available: 0 });
      continue;
    }
    // Stock is shared across planter choices for the same variant.
    const alreadyAllocated = priced.filter((p) => p.variantId === variant.id).reduce((s, p) => s + p.quantity, 0);
    const available = Math.max(0, variant.stock - alreadyAllocated);
    let quantity = line.quantity;
    if (quantity > available) {
      issues.push({
        slug: line.slug,
        variant: line.variant,
        kind: "insufficient_stock",
        message: `Only ${available} of ${product.name} (${variant.label}) left — quantity adjusted.`,
        available,
      });
      quantity = available;
      if (quantity <= 0) continue;
    }
    const unitPrice = variant.price + planterPrice;
    priced.push({
      slug: product.slug,
      variant: variant.code,
      planter: planterId,
      quantity,
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantLabel: variant.label,
      planterLabel,
      image: product.image,
      unitPrice,
      lineTotal: unitPrice * quantity,
      available: variant.stock,
    });
  }

  const subtotal = priced.reduce((s, l) => s + l.lineTotal, 0);
  let discount = 0;
  let appliedCode: string | null = null;
  let discountMessage: string | null = null;
  if (discountCode && discountCode.trim()) {
    const backend = await getBackend();
    const code = await backend.getDiscountCode(discountCode.trim().toUpperCase());
    const now = Date.now();
    if (!code || !code.isActive) discountMessage = "That code isn't valid.";
    else if (code.startsAt && Date.parse(code.startsAt) > now) discountMessage = "That code isn't active yet.";
    else if (code.endsAt && Date.parse(code.endsAt) < now) discountMessage = "That code has expired.";
    else if (code.maxRedemptions !== null && code.redemptions >= code.maxRedemptions) discountMessage = "That code has been fully redeemed.";
    else if (subtotal < code.minSubtotal) discountMessage = `Spend ₹${code.minSubtotal} or more to use this code.`;
    else {
      discount = code.kind === "percent" ? Math.floor((subtotal * Math.min(100, code.value)) / 100) : Math.min(subtotal, code.value);
      appliedCode = code.code;
      discountMessage = code.description;
    }
  }
  const deliveryFee = deliveryFeeFor(subtotal - discount);
  return {
    lines: priced,
    issues,
    subtotal,
    discount,
    discountCode: appliedCode,
    discountMessage,
    deliveryFee,
    total: Math.max(0, subtotal - discount + deliveryFee),
    currency: "INR",
  };
}

export function generateOrderNumber(date = new Date()) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, "");
  return `PS-${ymd}-${suffix}`;
}
