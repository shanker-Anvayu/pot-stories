"use client";

import { useSyncExternalStore } from "react";
import type { CartLineInput, CatalogProduct } from "./domain";
import { getCatalogSnapshot, unitPrice, variantFor } from "@/components/providers/catalog-provider";

/**
 * Client cart + wishlist store.
 * - Guests: persisted to localStorage (and synced across tabs).
 * - Signed-in users: additionally mirrored to the database by <AccountSync/>;
 *   the server re-prices and re-validates everything at checkout.
 * Uses useSyncExternalStore so server and first client render agree.
 */

export interface CartLine extends CartLineInput {
  id: string;
}

export interface AddOptions {
  variant?: string | null;
  planter?: string | null;
  quantity?: number;
}

interface StoreState {
  cart: CartLine[];
  wishlist: string[];
}

const STORAGE_KEY = "pot-stories:store:v2";
const LEGACY_KEY = "pot-stories:store:v1";
const MAX_QTY = 20;
const EMPTY: StoreState = { cart: [], wishlist: [] };

let state: StoreState = EMPTY;
let initialised = false;
const listeners = new Set<() => void>();
const changeListeners = new Set<(s: StoreState, origin: "local" | "remote") => void>();

const lineId = (slug: string, variant: string, planter: string | null) => `${slug}:${variant}:${planter ?? "none"}`;

function productFor(slug: string): CatalogProduct | undefined {
  return getCatalogSnapshot()?.products.find((p) => p.slug === slug);
}

/** Normalises a line against the live catalogue (variant/planter validity, stock cap). */
function normaliseLine(raw: { slug: string; variant?: string | null; planter?: string | null; quantity: number }): CartLine | null {
  const catalog = getCatalogSnapshot();
  const product = productFor(raw.slug);
  if (!catalog || !product) return null;
  const variant = variantFor(product, raw.variant ?? null);
  if (!variant) return null;
  const planter = product.potOptions
    ? (catalog.planters.find((p) => p.id === raw.planter && p.isActive)?.id ?? catalog.planters.find((p) => p.isActive)?.id ?? null)
    : null;
  const quantity = Math.min(MAX_QTY, Math.max(1, Math.round(raw.quantity)));
  return { id: lineId(product.slug, variant.code, planter), slug: product.slug, variant: variant.code, planter, quantity };
}

function mergeLines(lines: (CartLine | null)[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const l of lines) {
    if (!l) continue;
    const prev = merged.get(l.id);
    merged.set(l.id, { ...l, quantity: Math.min(MAX_QTY, (prev?.quantity ?? 0) + l.quantity) });
  }
  return [...merged.values()];
}

function sanitise(value: unknown, legacy = false): StoreState {
  if (!value || typeof value !== "object") return EMPTY;
  const raw = value as { cart?: unknown; wishlist?: unknown };
  const cart = Array.isArray(raw.cart)
    ? mergeLines(
        raw.cart.map((l) => {
          if (!l || typeof l !== "object") return null;
          const r = l as Record<string, unknown>;
          if (typeof r.slug !== "string") return null;
          const variant = legacy ? r.size : r.variant;
          const planter = legacy ? r.pot : r.planter;
          return normaliseLine({
            slug: r.slug,
            variant: typeof variant === "string" ? variant : null,
            planter: typeof planter === "string" ? planter : null,
            quantity: typeof r.quantity === "number" ? r.quantity : 1,
          });
        }),
      )
    : [];
  const wishlist = Array.isArray(raw.wishlist) ? raw.wishlist.filter((s): s is string => typeof s === "string" && !!productFor(s)) : [];
  return { cart, wishlist: Array.from(new Set(wishlist)) };
}

function emit(origin: "local" | "remote") {
  listeners.forEach((l) => l());
  changeListeners.forEach((l) => l(state, origin));
}

function init() {
  if (initialised || typeof window === "undefined" || !getCatalogSnapshot()) return;
  initialised = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = sanitise(JSON.parse(raw));
    else {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) state = sanitise(JSON.parse(legacy), true);
    }
  } catch {
    state = EMPTY;
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    try {
      state = event.newValue ? sanitise(JSON.parse(event.newValue)) : EMPTY;
    } catch {
      state = EMPTY;
    }
    emit("remote");
  });
}

function commit(next: StoreState, origin: "local" | "remote" = "local") {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — keep in memory */
  }
  emit(origin);
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => {
  init();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};
/** True once rendering on the client (after hydration). */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export const MAX_QUANTITY = MAX_QTY;

export const storeActions = {
  /** Returns false when the item can't be added (unknown or sold out). */
  addToCart(slug: string, options: AddOptions = {}): boolean {
    init();
    const line = normaliseLine({ slug, variant: options.variant, planter: options.planter, quantity: Math.max(1, options.quantity ?? 1) });
    if (!line) return false;
    const product = productFor(slug);
    const variant = product && variantFor(product, line.variant);
    if (!variant || variant.stock <= 0) return false;
    const inCartForVariant = state.cart.filter((l) => l.slug === slug && l.variant === line.variant).reduce((s, l) => s + l.quantity, 0);
    const room = Math.max(0, Math.min(MAX_QTY, variant.stock) - inCartForVariant);
    if (room <= 0) return false;
    line.quantity = Math.min(line.quantity, room);
    commit({ ...state, cart: mergeLines([...state.cart, line]) });
    return true;
  },
  setQuantity(id: string, quantity: number) {
    if (quantity < 1) return storeActions.remove(id);
    const line = state.cart.find((l) => l.id === id);
    const product = line && productFor(line.slug);
    const variant = product && variantFor(product, line.variant);
    const otherQty = state.cart.filter((l) => l.id !== id && line && l.slug === line.slug && l.variant === line.variant).reduce((s, l) => s + l.quantity, 0);
    const cap = variant ? Math.max(1, Math.min(MAX_QTY, variant.stock - otherQty)) : MAX_QTY;
    commit({ ...state, cart: state.cart.map((l) => (l.id === id ? { ...l, quantity: Math.min(cap, quantity) } : l)) });
  },
  remove(id: string) {
    commit({ ...state, cart: state.cart.filter((l) => l.id !== id) });
  },
  clearCart() {
    commit({ ...state, cart: [] });
  },
  /** Returns true when the item is now wishlisted. */
  toggleWishlist(slug: string): boolean {
    const has = state.wishlist.includes(slug);
    commit({ ...state, wishlist: has ? state.wishlist.filter((s) => s !== slug) : [...state.wishlist, slug] });
    return !has;
  },
};

/* ---- used by <AccountSync/> to mirror a signed-in user's cart/wishlist ---- */

export const storeSync = {
  getState: () => {
    init();
    return state;
  },
  /** Replace local state with server-canonical data (does not echo back to the server). */
  applyRemote(next: { cart: CartLineInput[]; wishlist: string[] }) {
    commit(sanitise({ cart: next.cart, wishlist: next.wishlist }), "remote");
  },
  clear() {
    commit(EMPTY, "remote");
  },
  onChange(fn: (s: StoreState, origin: "local" | "remote") => void) {
    changeListeners.add(fn);
    return () => {
      changeListeners.delete(fn);
    };
  },
  toInputs: (lines: CartLine[]): CartLineInput[] => lines.map(({ slug, variant, planter, quantity }) => ({ slug, variant, planter, quantity })),
};

export function linePrice(product: CatalogProduct, variant: string | null, planter: string | null) {
  return unitPrice(product, variant, planter, getCatalogSnapshot()?.planters ?? []);
}

export function useCartSummary() {
  const { cart } = useStore();
  const lines = cart.flatMap((line) => {
    const product = productFor(line.slug);
    if (!product) return [];
    const variant = variantFor(product, line.variant);
    return [{ ...line, product, variantInfo: variant, unit: linePrice(product, line.variant, line.planter) }];
  });
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);
  return { lines, count, subtotal };
}
