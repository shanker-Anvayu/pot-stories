"use client";

import { MotionConfig } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface UIContextValue {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  quickViewSlug: string | null;
  openQuickView: (slug: string) => void;
  closeQuickView: () => void;
  toasts: Toast[];
  notify: (message: string, action?: Toast["action"]) => void;
  dismissToast: (id: number) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const openCart = useCallback(() => {
    setSearchOpen(false);
    setQuickViewSlug(null);
    setCartOpen(true);
  }, []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openSearch = useCallback(() => {
    setCartOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openQuickView = useCallback((slug: string) => {
    setSearchOpen(false);
    setQuickViewSlug(slug);
  }, []);
  const closeQuickView = useCallback(() => setQuickViewSlug(null), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, action?: Toast["action"]) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { id, message, action }]);
      window.setTimeout(() => dismissToast(id), 3200);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      cartOpen,
      openCart,
      closeCart,
      searchOpen,
      openSearch,
      closeSearch,
      quickViewSlug,
      openQuickView,
      closeQuickView,
      toasts,
      notify,
      dismissToast,
    }),
    [cartOpen, openCart, closeCart, searchOpen, openSearch, closeSearch, quickViewSlug, openQuickView, closeQuickView, toasts, notify, dismissToast],
  );

  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.26, 0.54, 0.32, 1] }}>
      <UIContext.Provider value={value}>{children}</UIContext.Provider>
    </MotionConfig>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within <UIProvider>");
  return ctx;
}
