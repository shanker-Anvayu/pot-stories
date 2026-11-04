"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";
import { useUI } from "@/components/providers/ui-provider";
import { storeActions, useStore } from "@/lib/store";
import { cn } from "@/lib/format";

interface WishlistButtonProps {
  slug: string;
  name: string;
  className?: string;
  variant?: "floating" | "outline";
}

const BURST = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2);

export function WishlistButton({ slug, name, className, variant = "floating" }: WishlistButtonProps) {
  const { wishlist } = useStore();
  const { notify } = useUI();
  const active = wishlist.includes(slug);
  const [burstKey, setBurstKey] = useState(0);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const added = storeActions.toggleWishlist(slug);
        if (added) setBurstKey((k) => k + 1);
        notify(added ? `${name} saved to your wishlist` : `${name} removed from your wishlist`);
      }}
      className={cn(
        "relative grid place-items-center rounded-full transition-[background-color,border-color,transform,scale] duration-200 active:scale-90",
        variant === "floating"
          ? "size-9 bg-card/85 text-forest-900 shadow-[0_1px_4px_rgba(20,40,29,0.12)] backdrop-blur-sm hover:bg-card"
          : "size-[3.1rem] border border-forest-900/20 bg-card text-forest-900 hover:border-forest-900",
        className,
      )}
    >
      {/* burst particles */}
      <AnimatePresence>
        {burstKey > 0 && (
          <span key={burstKey} aria-hidden className="pointer-events-none absolute inset-0">
            {BURST.map((angle, i) => (
              <motion.span
                key={i}
                className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-clay"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(angle) * 18, y: Math.sin(angle) * 18, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.55, ease: [0.165, 0.84, 0.44, 1] }}
              />
            ))}
          </span>
        )}
      </AnimatePresence>
      <motion.span
        key={active ? "on" : "off"}
        initial={{ scale: active ? 0.2 : 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 14 }}
        className="grid place-items-center"
      >
        <Heart
          className={cn("size-[1.15rem] transition-colors duration-200", active ? "fill-clay text-clay" : "text-forest-900")}
          strokeWidth={1.8}
          aria-hidden
        />
      </motion.span>
    </button>
  );
}
