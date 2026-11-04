"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSessionSummary, type SessionSummary } from "@/app/actions/session";
import { mergeCart, mergeWishlist, syncCart, syncWishlist } from "@/app/actions/cart";
import { storeSync } from "@/lib/store";

interface SessionContextValue extends SessionSummary {
  loading: boolean;
  /** Re-reads the session (call after sign-in / sign-out). */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Which account the browser's bag/wishlist currently mirrors (null = guest). */
const OWNER_KEY = "pot-stories:store-owner";
function readOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}
function writeOwner(id: string | null) {
  try {
    if (id) window.localStorage.setItem(OWNER_KEY, id);
    else window.localStorage.removeItem(OWNER_KEY);
  } catch {
    /* storage unavailable — merge falls back to treating data as guest data */
  }
}

/**
 * Knows who is signed in and keeps a signed-in user's cart/wishlist mirrored
 * to the database: merges the guest cart on sign-in, then syncs changes.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<SessionSummary>({ user: null, backend: "demo", payments: "demo", readOnly: false });
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    const next = await getSessionSummary().catch(() => null);
    if (!next) {
      setLoading(false);
      return;
    }
    const prevId = userIdRef.current;
    userIdRef.current = next.user?.id ?? null;
    setSummary(next);
    setLoading(false);

    if (next.user && next.user.id !== prevId) {
      // Signed in (or first load while signed in). If the browser store already
      // mirrors this account, don't merge it again (that would double every
      // quantity on each reload) — just fetch the saved copy.
      const userId = next.user.id;
      const snapshot = storeSync.getState();
      const isGuestData = readOwner() !== userId;
      const [cart, wishlist] = await Promise.all([
        mergeCart(isGuestData ? storeSync.toInputs(snapshot.cart) : []),
        mergeWishlist(isGuestData ? snapshot.wishlist : []),
      ]);
      if (!cart.ok || !wishlist.ok || userIdRef.current !== userId) return;

      // Keep anything the shopper added while the request was in flight.
      const current = storeSync.getState();
      const before = new Map(snapshot.cart.map((l) => [l.id, l.quantity]));
      const extra = storeSync
        .toInputs(current.cart)
        .map((l, i) => ({ ...l, quantity: l.quantity - (before.get(current.cart[i].id) ?? 0) }))
        .filter((l) => l.quantity > 0);
      const addedSlugs = current.wishlist.filter((s) => !snapshot.wishlist.includes(s));
      const removedSlugs = snapshot.wishlist.filter((s) => !current.wishlist.includes(s));
      const finalCart = [...cart.data, ...extra];
      const finalWishlist = [...new Set([...wishlist.data, ...addedSlugs])].filter((s) => !removedSlugs.includes(s));

      storeSync.applyRemote({ cart: finalCart, wishlist: finalWishlist });
      writeOwner(userId);
      if (extra.length || addedSlugs.length || removedSlugs.length) {
        const settled = storeSync.getState();
        void syncCart(storeSync.toInputs(settled.cart));
        void syncWishlist(settled.wishlist);
      }
    } else if (!next.user && prevId) {
      // Signed out: don't leave the account's bag on a shared device.
      storeSync.clear();
      writeOwner(null);
    } else if (!next.user && readOwner()) {
      // Session expired since the last visit: the stored bag belongs to an account.
      storeSync.clear();
      writeOwner(null);
    }
  }, []);

  useEffect(() => {
    // Initial session read after hydration (cookie-dependent, so not prerendered).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(
    () =>
      storeSync.onChange((state, origin) => {
        if (origin !== "local" || !userIdRef.current) return;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          void syncCart(storeSync.toInputs(state.cart));
          void syncWishlist(state.wishlist);
        }, 500);
      }),
    [],
  );

  const value = useMemo(() => ({ ...summary, loading, refresh }), [summary, loading, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}
