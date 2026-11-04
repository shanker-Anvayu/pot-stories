"use client";

import { useCallback } from "react";
import { useUI } from "@/components/providers/ui-provider";
import { storeActions, type AddOptions } from "@/lib/store";

/** Adds a product to the bag and slides the cart drawer open. Returns false if it couldn't be added. */
export function useAddToCart() {
  const { openCart, notify } = useUI();
  return useCallback(
    (slug: string, options?: AddOptions) => {
      const added = storeActions.addToCart(slug, options);
      if (added) openCart();
      else notify("Sorry — that option is sold out or already at the stock limit in your bag.");
      return added;
    },
    [openCart, notify],
  );
}
